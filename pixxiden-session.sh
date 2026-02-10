#!/bin/bash

# 1. Nettoyage de l'environnement
export XDG_SESSION_TYPE=wayland
export XDG_CURRENT_DESKTOP=pixxiden

# XDG_RUNTIME_DIR est requis par Cage/wlroots pour créer le socket Wayland
# Le login manager ne le fournit pas toujours
if [ -z "$XDG_RUNTIME_DIR" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  mkdir -p "$XDG_RUNTIME_DIR"
fi

# 2. Fix spécifiques NVIDIA pour wlroots (utilisé par Cage)
export WLR_NO_HARDWARE_CURSORS=1
export LIBVA_DRIVER_NAME=nvidia
export __GLX_VENDOR_LIBRARY_NAME=nvidia

# 3. Fix WebKit (ton sauveur actuel)
export WEBKIT_DISABLE_COMPOSITING_MODE=1

# 4. Lancement de Cage
# L'option -s permet de supprimer le curseur après un délai d'inactivité (utile pour le tactile/manette)
# -m last : utilise uniquement le dernier écran connecté (évite les écrans éteints)
# Les logs applicatifs sont gérés par tauri-plugin-log → ~/.local/share/com.Pixxiden.launcher/logs/
exec cage -s -m last -- /opt/pixxiden/Pixxiden.AppImage