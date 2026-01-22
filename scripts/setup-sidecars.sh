#!/usr/bin/env bash
# Setup sidecars pour PixiDen

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARIES_DIR="$SCRIPT_DIR/../src-tauri/binaries"

# Détecter l'architecture
ARCH=$(rustc -vV | grep host | cut -d' ' -f2)
echo "Detected architecture: $ARCH"

mkdir -p "$BINARIES_DIR"

# Fonction pour télécharger et renommer un binaire
setup_binary() {
    local name=$1
    local url=$2
    local target_name="${name}-${ARCH}"
    local target_path="$BINARIES_DIR/$target_name"
    
    if [ -f "$target_path" ]; then
        echo "✅ $target_name already exists"
        return
    fi
    
    echo "📥 Downloading $name..."
    
    if command -v "$name" &> /dev/null; then
        # Copier depuis le système
        cp "$(which $name)" "$target_path"
    else
        # Télécharger depuis URL
        if [ -n "$url" ]; then
            curl -L "$url" -o "$target_path"
        else
            echo "⚠️  $name not found in PATH and no URL provided"
            echo "   Please install manually or provide URL"
            return 1
        fi
    fi
    
    chmod +x "$target_path"
    echo "✅ $target_name ready"
}

# Setup des binaires
setup_binary "legendary" ""
setup_binary "nile" ""
setup_binary "gogdl" ""

echo ""
echo "🎉 All sidecars configured!"
echo ""
echo "Binaries in: $BINARIES_DIR"
ls -lh "$BINARIES_DIR"
