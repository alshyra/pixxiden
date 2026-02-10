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
exec cage /opt/pixxiden/Pixxiden.AppImage
