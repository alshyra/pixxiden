#!/bin/bash

echo "🔍 Diagnostic Wayland pour Game Launcher"
echo "========================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Type de session
echo -e "${BLUE}1. Type de session${NC}"
if [ -n "$WAYLAND_DISPLAY" ]; then
    echo -e "${GREEN}✓${NC} Session Wayland active"
    echo "  WAYLAND_DISPLAY=$WAYLAND_DISPLAY"
else
    echo -e "${YELLOW}⚠${NC} Pas de session Wayland détectée"
    echo "  WAYLAND_DISPLAY est vide"
fi

if [ -n "$DISPLAY" ]; then
    echo -e "${GREEN}✓${NC} X11 disponible"
    echo "  DISPLAY=$DISPLAY"
fi

echo "  XDG_SESSION_TYPE=$XDG_SESSION_TYPE"
echo ""

# 2. Socket Wayland
echo -e "${BLUE}2. Socket Wayland${NC}"
if [ -n "$WAYLAND_DISPLAY" ]; then
    SOCKET_PATH="${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}"
    if [ -S "$SOCKET_PATH" ]; then
        echo -e "${GREEN}✓${NC} Socket Wayland trouvé: $SOCKET_PATH"
        ls -la "$SOCKET_PATH"
        
        # Vérifier les permissions
        if [ -r "$SOCKET_PATH" ] && [ -w "$SOCKET_PATH" ]; then
            echo -e "${GREEN}✓${NC} Permissions OK (lecture/écriture)"
        else
            echo -e "${RED}✗${NC} Problème de permissions !"
            echo "  Essayez: chmod 700 $SOCKET_PATH"
        fi
    else
        echo -e "${RED}✗${NC} Socket Wayland introuvable à: $SOCKET_PATH"
    fi
else
    echo -e "${YELLOW}⚠${NC} Pas de WAYLAND_DISPLAY défini"
fi
echo ""

# 3. Compositor Wayland
echo -e "${BLUE}3. Compositor Wayland${NC}"
if pgrep -x "gnome-shell" > /dev/null; then
    echo -e "${GREEN}✓${NC} GNOME Shell (Mutter)"
elif pgrep -x "kwin_wayland" > /dev/null; then
    echo -e "${GREEN}✓${NC} KDE Plasma (KWin)"
elif pgrep -x "sway" > /dev/null; then
    echo -e "${GREEN}✓${NC} Sway"
elif pgrep -x "gamescope" > /dev/null; then
    echo -e "${GREEN}✓${NC} Gamescope"
elif pgrep -x "Hyprland" > /dev/null; then
    echo -e "${GREEN}✓${NC} Hyprland"
else
    echo -e "${YELLOW}⚠${NC} Compositor inconnu ou X11"
fi
echo ""

# 4. WebKitGTK
echo -e "${BLUE}4. WebKitGTK${NC}"
if command -v pkg-config &> /dev/null; then
    if pkg-config --exists webkit2gtk-4.1; then
        VERSION=$(pkg-config --modversion webkit2gtk-4.1)
        echo -e "${GREEN}✓${NC} WebKitGTK 4.1 installé (version $VERSION)"
    elif pkg-config --exists webkit2gtk-4.0; then
        VERSION=$(pkg-config --modversion webkit2gtk-4.0)
        echo -e "${GREEN}✓${NC} WebKitGTK 4.0 installé (version $VERSION)"
    else
        echo -e "${RED}✗${NC} WebKitGTK non trouvé"
    fi
else
    echo -e "${YELLOW}⚠${NC} pkg-config non installé, impossible de vérifier"
fi
echo ""

# 5. Variables d'environnement actuelles
echo -e "${BLUE}5. Variables d'environnement actuelles${NC}"
echo "  GDK_BACKEND=$GDK_BACKEND"
echo "  QT_QPA_PLATFORM=$QT_QPA_PLATFORM"
echo "  SDL_VIDEODRIVER=$SDL_VIDEODRIVER"
echo "  MOZ_ENABLE_WAYLAND=$MOZ_ENABLE_WAYLAND"
echo ""

# 6. Test de connexion Wayland
echo -e "${BLUE}6. Test de connexion Wayland${NC}"
if [ -n "$WAYLAND_DISPLAY" ]; then
    # Tester avec weston-info si disponible
    if command -v weston-info &> /dev/null; then
        echo "Test avec weston-info..."
        if weston-info &> /dev/null; then
            echo -e "${GREEN}✓${NC} Connexion Wayland OK"
        else
            echo -e "${RED}✗${NC} Impossible de se connecter au compositor Wayland"
            echo "  Erreur: $(weston-info 2>&1 | head -n1)"
        fi
    elif command -v wayland-info &> /dev/null; then
        echo "Test avec wayland-info..."
        if wayland-info &> /dev/null; then
            echo -e "${GREEN}✓${NC} Connexion Wayland OK"
        else
            echo -e "${RED}✗${NC} Impossible de se connecter au compositor Wayland"
        fi
    else
        echo -e "${YELLOW}⚠${NC} weston-info/wayland-info non installé, impossible de tester"
        echo "  Installation: sudo pacman -S weston"
    fi
else
    echo -e "${YELLOW}⚠${NC} Pas de session Wayland à tester"
fi
echo ""

# 7. Recommandations
echo -e "${BLUE}7. Recommandations${NC}"
if [ -n "$WAYLAND_DISPLAY" ]; then
    if [ -z "$GDK_BACKEND" ]; then
        echo -e "${YELLOW}⚠${NC} GDK_BACKEND non défini"
        echo "  Ajouter: export GDK_BACKEND=wayland"
    elif [ "$GDK_BACKEND" != "wayland" ]; then
        echo -e "${YELLOW}⚠${NC} GDK_BACKEND=$GDK_BACKEND (devrait être 'wayland')"
        echo "  Ajouter: export GDK_BACKEND=wayland"
    else
        echo -e "${GREEN}✓${NC} GDK_BACKEND correctement défini"
    fi
else
    echo -e "${YELLOW}⚠${NC} Pas de session Wayland active"
    echo "  Lancez votre session de bureau en mode Wayland"
    echo "  Ou testez en mode Gamescope: ./game-launcher-session.sh"
fi
echo ""

# 8. Solution aux erreurs courantes
echo -e "${BLUE}8. Solutions aux erreurs courantes${NC}"
echo ""
echo -e "${YELLOW}Si erreur 'Error 71 (Erreur de protocole)'${NC}"
echo "  1. Vérifier les permissions du socket:"
echo "     ls -la \$XDG_RUNTIME_DIR/\$WAYLAND_DISPLAY"
echo ""
echo "  2. Redémarrer le compositor Wayland (logout/login)"
echo ""
echo "  3. Forcer les variables:"
echo "     export GDK_BACKEND=wayland"
echo "     export WAYLAND_DISPLAY=wayland-0  # ou wayland-1"
echo ""
echo "  4. Si le problème persiste, utiliser XWayland temporairement:"
echo "     export GDK_BACKEND=x11"
echo ""
echo -e "${YELLOW}Si WebKitGTK crash au démarrage${NC}"
echo "  1. Vérifier la version de WebKitGTK:"
echo "     pacman -Q webkit2gtk-4.1"
echo ""
echo "  2. Mettre à jour:"
echo "     sudo pacman -Syu webkit2gtk-4.1"
echo ""
echo "  3. Vider le cache:"
echo "     rm -rf ~/.cache/webkit*"
echo ""

echo "========================================"
echo -e "${GREEN}Diagnostic terminé${NC}"
echo ""
echo "Pour lancer le launcher avec Wayland:"
echo "  export GDK_BACKEND=wayland"
echo "  ./dev.sh"