#!/bin/bash

# 🔍 Check CLIs Installation Script
# Vérifie que legendary, gogdl et nile sont installés

echo "🔍 Checking Store Authentication CLIs..."
echo ""

MISSING_CLIS=()

# Check legendary (Epic Games)
if command -v legendary &> /dev/null; then
    LEGENDARY_VERSION=$(legendary --version 2>&1 | head -n 1)
    echo "✅ legendary: $LEGENDARY_VERSION"
else
    echo "❌ legendary: NOT FOUND"
    MISSING_CLIS+=("legendary-gl")
fi

# Check gogdl (GOG)
if command -v gogdl &> /dev/null; then
    GOGDL_VERSION=$(gogdl --version 2>&1 | head -n 1)
    echo "✅ gogdl: $GOGDL_VERSION"
else
    echo "❌ gogdl: NOT FOUND"
    MISSING_CLIS+=("gogdl")
fi

# Check nile (Amazon Games)
if command -v nile &> /dev/null; then
    NILE_VERSION=$(nile --version 2>&1 | head -n 1)
    echo "✅ nile: $NILE_VERSION"
else
    echo "❌ nile: NOT FOUND"
    MISSING_CLIS+=("nile")
fi

echo ""

# Summary
if [ ${#MISSING_CLIS[@]} -eq 0 ]; then
    echo "🎉 All CLIs are installed!"
    echo ""
    echo "You can now use store authentication in PixiDen."
    exit 0
else
    echo "⚠️  Missing CLIs: ${MISSING_CLIS[@]}"
    echo ""
    echo "To install missing CLIs, run:"
    echo ""
    for CLI in "${MISSING_CLIS[@]}"; do
        echo "  pip install $CLI"
    done
    echo ""
    echo "Or install all at once:"
    echo "  pip install legendary-gl gogdl nile"
    echo ""
    exit 1
fi
