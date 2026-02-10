#!/bin/bash

# Script de déploiement pour Pixxiden
# Ce script copie dans /opt/pixxiden l'appiimage
# il enmvooie aussi dans /usr/share/wayland-sessions le fichier pixiden-session.sh pour permettre le lancement depuis l'écran de connexion


cp ./src-tauri/target/release/bundle/appimage/Pixxiden_0.1.0_amd64.AppImage /opt/pixxiden/Pixxiden.AppImage
chmod +x /opt/pixxiden/Pixxiden.AppImage

cp ./pixxiden-session.sh /usr/share/wayland-sessions/
chmod +x /usr/share/wayland-sessions/pixxiden-session.sh

cp ./pixxiden-session.desktop /usr/share/wayland-sessions/
