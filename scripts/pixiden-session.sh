#!/bin/bash
# Pixxiden Gaming Session - Wayland fullscreen launcher

# Variables d'environnement Wayland
export XDG_SESSION_TYPE=wayland
export XDG_SESSION_DESKTOP=pixxiden
export XDG_CURRENT_DESKTOP=pixxiden

# Variables pour WebKit Tauri
export WEBKIT_DISABLE_COMPOSITING_MODE=1

# Variables pour le support manettes
export SDL_GAMECONTROLLER_ALLOW_BACKGROUND_EVENTS=1
export SDL_JOYSTICK_HIDAPI=1

# Lancement de Pixxiden
exec /opt/pixxiden/Pixxiden.AppImage
