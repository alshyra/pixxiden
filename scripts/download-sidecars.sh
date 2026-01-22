#!/usr/bin/env bash
# PixiDen - Sidecar Binary Downloader
# Reads from dependencies.yaml and downloads binaries

# Don't exit on error - we want to try all binaries even if some fail
# set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/dependencies.yaml"
BINARIES_DIR="$SCRIPT_DIR/../src-tauri/binaries"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 PixiDen Sidecar Downloader${NC}"
echo ""

# Simple YAML parser (no yq dependency required)
get_yaml_value() {
    local key=$1
    local file=$2
    
    # Handle nested keys (e.g., "binaries.legendary.version")
    if [[ "$key" == *.*.* ]]; then
        local parts=(${key//./ })
        local level1="${parts[0]}"
        local level2="${parts[1]}"
        local level3="${parts[2]}"
        
        # Extract value with simple grep/sed
        grep -A 50 "^${level1}:" "$file" | \
        grep -A 20 "^  ${level2}:" | \
        grep "^    ${level3}:" | \
        sed 's/.*: *"\?\([^"]*\)"\?.*/\1/' | \
        head -n 1
    elif [[ "$key" == *.* ]]; then
        local parts=(${key//./ })
        local level1="${parts[0]}"
        local level2="${parts[1]}"
        
        grep -A 20 "^${level1}:" "$file" | \
        grep "^  ${level2}:" | \
        sed 's/.*: *"\?\([^"]*\)"\?.*/\1/' | \
        head -n 1
    else
        grep "^${key}:" "$file" | sed 's/.*: *"\?\([^"]*\)"\?.*/\1/' | head -n 1
    fi
}

get_binary_url() {
    local name=$1
    local platform=$2
    
    # Extract URL from YAML (more robust parsing)
    awk -v name="$name" -v platform="$platform" '
    BEGIN { in_binary=0; in_sources=0; in_platform=0 }
    $0 ~ "^  " name ":" { in_binary=1; next }
    in_binary && /^  [a-z]/ && $0 !~ "^  " name ":" { in_binary=0 }
    in_binary && /^    sources:/ { in_sources=1; next }
    in_sources && /^    [a-z]/ && !/^      / { in_sources=0 }
    in_sources && $0 ~ "^      " platform ":" { in_platform=1; next }
    in_platform && /^      [a-z]/ && $0 !~ "^        " { in_platform=0 }
    in_platform && /^        url:/ { 
        gsub(/^        url: *"?/, "")
        gsub(/"$/, "")
        print
        exit
    }
    ' "$CONFIG_FILE"
}

get_binary_checksum() {
    local name=$1
    local platform=$2
    
    awk -v name="$name" -v platform="$platform" '
    BEGIN { in_binary=0; in_sources=0; in_platform=0 }
    $0 ~ "^  " name ":" { in_binary=1; next }
    in_binary && /^  [a-z]/ && $0 !~ "^  " name ":" { in_binary=0 }
    in_binary && /^    sources:/ { in_sources=1; next }
    in_sources && /^    [a-z]/ && !/^      / { in_sources=0 }
    in_sources && $0 ~ "^      " platform ":" { in_platform=1; next }
    in_platform && /^      [a-z]/ && $0 !~ "^        " { in_platform=0 }
    in_platform && /^        checksum:/ { 
        gsub(/^        checksum: *"?/, "")
        gsub(/"$/, "")
        print
        exit
    }
    ' "$CONFIG_FILE"
}

get_fallback_info() {
    local name=$1
    local field=$2
    
    awk -v name="$name" -v field="$field" '
    BEGIN { in_binary=0; in_fallback=0 }
    $0 ~ "^  " name ":" { in_binary=1; next }
    in_binary && /^  [a-z]/ && $0 !~ "^  " name ":" { in_binary=0 }
    in_binary && /^    fallback:/ { in_fallback=1; next }
    in_fallback && /^    [a-z]/ && !/^      / { in_fallback=0 }
    in_fallback && $0 ~ "^      " field ":" { 
        gsub(/^      [^:]*: *"?/, "")
        gsub(/"$/, "")
        print
        exit
    }
    ' "$CONFIG_FILE"
}

# Detect architecture
RUST_TARGET=$(rustc -vV | grep host | cut -d' ' -f2)
echo "Detected Rust target: $RUST_TARGET"

# Map Rust target to our naming
PLATFORM=$(awk -v target="$RUST_TARGET" '
/^target_mappings:/ { in_mappings=1; next }
in_mappings && /^[^ ]/ { exit }
in_mappings && $0 ~ target {
    gsub(/.*: *"?/, "")
    gsub(/"$/, "")
    print
    exit
}
' "$CONFIG_FILE")

if [ -z "$PLATFORM" ] || [ "$PLATFORM" = "null" ]; then
    echo -e "${RED}❌ Unsupported platform: $RUST_TARGET${NC}"
    exit 1
fi

echo "Platform: $PLATFORM"
echo ""

mkdir -p "$BINARIES_DIR"

# Create Python wrapper for packages without binaries
create_python_wrapper() {
    local name=$1
    local package=$2
    local target_file="$BINARIES_DIR/${name}-${RUST_TARGET}"
    
    if [ -f "$target_file" ]; then
        echo -e "${GREEN}✅ $name wrapper already present${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🔧 Creating Python wrapper for $name...${NC}"
    
    # Check if package is available via which/command
    if command -v "$name" &> /dev/null; then
        echo "   Found $name in PATH, creating symlink wrapper"
        cp "$(which $name)" "$target_file"
        chmod +x "$target_file"
        echo -e "${GREEN}✅ $name wrapper created from system installation${NC}"
        return 0
    fi
    
    # Check if Python package is installed
    if python3 -c "import ${package//-/_}" 2>/dev/null; then
        echo "   Found Python package, creating wrapper script"
        
        # Create wrapper script that calls Python module
        cat > "$target_file" <<'WRAPPER_EOF'
#!/usr/bin/env python3
import sys
import runpy

# Run the module as __main__
sys.exit(runpy.run_module('PACKAGE_NAME', run_name='__main__'))
WRAPPER_EOF
        
        sed -i "s/PACKAGE_NAME/${package//-/_}/g" "$target_file"
        chmod +x "$target_file"
        echo -e "${GREEN}✅ $name wrapper created${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  Python package '$package' not found${NC}"
    echo ""
    echo "Please install it with:"
    echo -e "  ${BLUE}pipx install $package${NC}"
    echo "  OR"
    echo -e "  ${BLUE}pip install --user $package${NC}"
    echo ""
    return 1
}

# Function to download a binary
download_binary() {
    local name=$1
    
    # Get binary configuration
    local version=$(get_yaml_value "binaries.${name}.version" "$CONFIG_FILE")
    local enabled=$(get_yaml_value "binaries.${name}.enabled" "$CONFIG_FILE")
    local url_template=$(get_binary_url "$name" "$PLATFORM")
    local checksum=$(get_binary_checksum "$name" "$PLATFORM")
    
    if [ "$enabled" != "true" ]; then
        echo -e "${YELLOW}⏭️  $name is disabled, skipping${NC}"
        return 0
    fi
    
    if [ -z "$url_template" ] || [ "$url_template" = "null" ]; then
        echo -e "${YELLOW}⚠️  No binary URL for $name on $PLATFORM${NC}"
        
        # Check for fallback
        local fallback_type=$(get_fallback_info "$name" "type")
        
        if [ "$fallback_type" = "python-wrapper" ]; then
            local package=$(get_fallback_info "$name" "package")
            echo "   Using Python wrapper fallback for package: $package"
            if create_python_wrapper "$name" "$package"; then
                return 0
            else
                return 1
            fi
        else
            echo "   No fallback available"
            return 1
        fi
    fi
    
    # Replace {version} in URL
    local url="${url_template//\{version\}/$version}"
    local target_file="$BINARIES_DIR/${name}-${RUST_TARGET}"
    
    # Check if already downloaded
    if [ -f "$target_file" ]; then
        echo -e "${GREEN}✅ $name v$version already present${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📥 Downloading $name v$version...${NC}"
    echo "   URL: $url"
    
    # Download to temp file
    local temp_file=$(mktemp)
    
    if curl -L -f --progress-bar "$url" -o "$temp_file" 2>&1; then
        # Verify checksum if provided
        if [ -n "$checksum" ] && [ "$checksum" != "null" ] && [ "$checksum" != "" ]; then
            local algo=$(echo "$checksum" | cut -d: -f1)
            local expected_hash=$(echo "$checksum" | cut -d: -f2)
            
            echo "   Verifying $algo checksum..."
            local actual_hash=$(${algo}sum "$temp_file" | cut -d' ' -f1)
            
            if [ "$actual_hash" != "$expected_hash" ]; then
                echo -e "${RED}❌ Checksum mismatch for $name!${NC}"
                echo "   Expected: $expected_hash"
                echo "   Got:      $actual_hash"
                rm -f "$temp_file"
                return 1
            fi
            
            echo -e "${GREEN}   ✓ Checksum verified${NC}"
        fi
        
        # Move to target location
        mv "$temp_file" "$target_file"
        chmod +x "$target_file"
        
        # Verify it's executable
        if file "$target_file" 2>/dev/null | grep -qi "executable\|script"; then
            echo -e "${GREEN}✅ $name v$version ready${NC}"
        else
            echo -e "${YELLOW}⚠️  $name downloaded but may not be executable${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to download $name from $url${NC}"
        rm -f "$temp_file"
        
        # Try fallback
        local fallback_type=$(get_fallback_info "$name" "type")
        if [ "$fallback_type" = "python-wrapper" ]; then
            local package=$(get_fallback_info "$name" "package")
            echo "   Attempting fallback with Python wrapper for: $package"
            if create_python_wrapper "$name" "$package"; then
                return 0
            fi
        fi
        
        return 1
    fi
}

# Process all binaries
BINARIES=("legendary" "gogdl" "nile")
SUCCESS_COUNT=0
FAILED_COUNT=0

for binary in "${BINARIES[@]}"; do
    if download_binary "$binary"; then
        ((SUCCESS_COUNT++))
    else
        ((FAILED_COUNT++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Success: $SUCCESS_COUNT${NC}  ${RED}❌ Failed: $FAILED_COUNT${NC}"
echo ""
echo "Binaries in: $BINARIES_DIR"
ls -lh "$BINARIES_DIR" 2>/dev/null || echo "No binaries found"
echo ""

if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some binaries failed to download. Build may fail.${NC}"
    echo "   Run the script again or install manually."
    exit 0  # Don't fail CI if fallbacks are available
fi

echo -e "${GREEN}🎉 All sidecars configured successfully!${NC}"
