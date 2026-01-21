# PixiDen - Quick Start Guide

## Installation des Dépendances

### CLI Tools (Epic, GOG, Amazon)

#### Arch Linux
```bash
yay -S legendary heroic-gogdl nile
```

#### Ubuntu/Debian
```bash
# Legendary (Epic Games)
sudo pip3 install legendary-gl --break-system-packages

# GOGdl
wget https://github.com/Heroic-Games-Launcher/heroic-gogdl/releases/download/v0.x.x/gogdl
chmod +x gogdl
sudo mv gogdl /usr/local/bin/

# Nile (Amazon Games)
sudo pip3 install nile --break-system-packages
```

### Wine-GE (Recommandé)

> **Note:** Wine-GE development has been archived. The latest available version is GE-Proton8-26.

```bash
# Créer le répertoire
mkdir -p ~/.local/share/wine-ge

# Télécharger Wine-GE
cd ~/.local/share/wine-ge
wget https://github.com/GloriousEggroll/wine-ge-custom/releases/download/GE-Proton8-26/wine-lutris-GE-Proton8-26-x86_64.tar.xz

# Extraire
tar -xf wine-lutris-GE-Proton8-26-x86_64.tar.xz
rm wine-lutris-GE-Proton8-26-x86_64.tar.xz
```

## Lancement du Backend

```bash
cd backend
go mod download
go run cmd/pixiden-daemon/main.go
```

Le backend démarre sur le port 9090.

## Lancement du Frontend

```bash
cd frontend
npm install
npm run tauri:dev
```

## Première Utilisation

### 1. Authentification Epic Games

```bash
# Via le CLI Legendary (ouvre le navigateur)
legendary auth

# Ou via l'interface PixiDen
# Settings > Stores > Epic Games > Login
```

### 2. Synchroniser la bibliothèque

Dans PixiDen :
- Cliquer sur le bouton "Sync" dans la vue Library
- Vos jeux Epic Games seront importés automatiquement

### 3. Lancer un jeu

- Cliquer sur la cover d'un jeu installé
- Cliquer sur le bouton Play (icône verte)

## Résolution de Problèmes

### Le backend ne démarre pas

Vérifier que le port 9090 n'est pas utilisé :
```bash
lsof -i :9090
```

### Legendary ne trouve pas les jeux

Vérifier l'authentification :
```bash
legendary status
```

### Wine-GE non détecté

Vérifier le chemin dans la config :
```bash
cat ~/.config/pixiden/config.yaml
```

Ou éditer manuellement :
```yaml
runners:
  wine_ge:
    enabled: true
    path: /home/user/.local/share/wine-ge/lutris-GE-Proton9-15-x86_64
```

## Logs

Les logs du backend sont affichés dans le terminal.

Pour plus de détails :
```bash
PIXIDEN_LOG_LEVEL=debug go run cmd/pixiden-daemon/main.go
```

## Mode Session (Wayland)

Pour utiliser PixiDen comme session de jeu (comme SteamOS) :

```bash
# Copier le fichier de session
sudo cp pixiden-session.desktop /usr/share/wayland-sessions/

# Se déconnecter et sélectionner "PixiDen Session"
```

Nécessite Gamescope :
```bash
# Arch
sudo pacman -S gamescope

# Ubuntu (via Flatpak)
flatpak install org.freedesktop.Platform.VulkanLayer.gamescope
```

## Aide

Pour plus d'informations, consultez la documentation complète dans `/docs`.
