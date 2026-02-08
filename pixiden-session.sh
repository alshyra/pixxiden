#!/bin/bash
# Pixxiden Gaming Session

# Variables d'environnement Wayland
export XDG_SESSION_TYPE=wayland
export XDG_SESSION_DESKTOP=pixxiden
export XDG_CURRENT_DESKTOP=pixxiden

# Fix WebKit rendering sur Wayland
export WEBKIT_DISABLE_COMPOSITING_MODE=1

# /usr/bin/startplasma-wayland & 
# Attendre que Plasma soit complètement lancé
# sleep 5 
# Lancement de gamescope avec Pixxiden
exec gamescope \
    --output-width 1920 \
    --output-height 1080 \
    --nested-width 1920 \
    --nested-height 1080 \
    --nested-refresh 60 \
    --scaler auto \
    --filter linear \
    --fullscreen \
    --adaptive-sync \
    -- /opt/pixxiden/Pixxiden.AppImage
