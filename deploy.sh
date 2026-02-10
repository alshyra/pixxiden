#!/bin/bash

# Script de déploiement pour Pixxiden
# Ce script copie l'AppImage dans /opt/pixxiden
# Pixxiden démarre automatiquement via le plugin autostart (KDE/GNOME/etc.)

mkdir -p /opt/pixxiden
cp ./src-tauri/target/release/bundle/appimage/Pixxiden_0.1.0_amd64.AppImage /opt/pixxiden/Pixxiden.AppImage
chmod +x /opt/pixxiden/Pixxiden.AppImage

echo "Pixxiden déployé dans /opt/pixxiden/Pixxiden.AppImage"
echo "Pour activer l'autostart, lancez Pixxiden une première fois."
