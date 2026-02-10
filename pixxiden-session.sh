#!/bin/bash

# 1. Nettoyage de l'environnement
export XDG_SESSION_TYPE=wayland
export XDG_CURRENT_DESKTOP=pixxiden

# 2. Fix spécifiques NVIDIA pour wlroots (utilisé par Cage)
export WLR_NO_HARDWARE_CURSORS=1
export LIBVA_DRIVER_NAME=nvidia
export __GLX_VENDOR_LIBRARY_NAME=nvidia

# export XDG_RUNTIME_DIR=

# 3. Fix WebKit (ton sauveur actuel)
export WEBKIT_DISABLE_COMPOSITING_MODE=1

# 4. Lancement de Cage
# L'option -s permet de supprimer le curseur après un délai d'inactivité (utile pour le tactile/manette)
# -m last : utilise uniquement le dernier écran connecté (évite les écrans éteints)
exec cage -s -m last -- /opt/pixxiden/Pixxiden.AppImage > /tmp/pixxiden-session.log 2>&1