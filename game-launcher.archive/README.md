# Game Launcher - Linux Session Mode

Un launcher de jeux moderne pour Linux avec support clavier/gamepad, conçu pour fonctionner en mode session via Gamescope (façon SteamOS).

## 🏗️ Architecture

- **Frontend**: Vue 3 + Tailwind CSS + Pinia
- **Enveloppe**: Tauri 2.x
- **Backend**: Go (WebSocket) en tant que Sidecar
- **Cible**: Session Wayland via Gamescope

## 📁 Structure du projet

```
game-launcher/
├── src/                    # Frontend Vue 3
│   ├── components/
│   │   └── GameGrid.vue   # Grille de jeux avec navigation
│   ├── stores/
│   │   └── gameStore.ts   # Store Pinia (WebSocket + état)
│   ├── App.vue            # Composant principal
│   ├── main.ts            # Point d'entrée
│   └── style.css          # Styles Tailwind
├── src-go/                # Backend Go
│   ├── main.go            # Serveur WebSocket
│   └── go.mod             # Dépendances Go
├── src-tauri/             # Configuration Tauri
│   ├── src/
│   │   └── main.rs        # Application Rust (lance le sidecar)
│   ├── tauri.conf.json    # Configuration Tauri + Sidecar
│   └── Cargo.toml         # Dépendances Rust
├── build-backend.sh       # Script de compilation Go
├── dev.sh                 # Script de développement
└── package.json           # Dépendances npm
```

## 🎮 Game Stores supportés

Le launcher détecte automatiquement vos jeux installés via :

### Heroic Games Launcher ⭐
- **Epic Games Store** - Tous vos jeux Epic
- **GOG** - Jeux DRM-free de GOG
- **Amazon Prime Gaming** - Jeux gratuits Amazon

Lancement : `heroic --no-gui launch {appName}`

### Steam
- **Bibliothèque Steam** - Jeux Linux natifs + Proton
- Détection automatique des jeux installés
- Covers automatiques

Lancement : `steam steam://rungameid/{APPID}`

📚 **Documentation complète** : [GAME_STORES.md](GAME_STORES.md)

**Note** : Le launcher délègue complètement les mises à jour et l'authentification aux clients natifs (Heroic, Steam). Pas de gestion DRM, tout passe par les launchers officiels.

---

## 🖥️ Session Mode (Console dédiée)

Le launcher peut être installé comme **session système** pour une véritable expérience console.

### Installation rapide

```bash
# Depuis le répertoire du projet
./install-session.sh
```

Le script installe automatiquement :
- ✅ Binaires dans `/usr/local/bin/`
- ✅ Session dans `/usr/share/wayland-sessions/`
- ✅ Configuration optionnelle de l'auto-login

### Utilisation

1. **Logout** de votre session actuelle
2. Sur l'écran de login, sélectionner **"Game Launcher"**
3. Se connecter
4. Le launcher démarre en plein écran via **Gamescope**

### Mode Console vs Mode Desktop

| Feature | Console (Session) | Desktop (App) |
|---------|------------------|---------------|
| Plein écran | ✅ Natif (Gamescope) | ⚠️ F11 |
| Performance | ✅ Maximale | ✅ Bonne |
| Boot direct | ✅ Auto-login | ❌ Manuel |
| Poweroff intégré | ✅ Menu système | ❌ Bureau |
| Isolation | ✅ Session dédiée | ❌ Desktop visible |

📚 **Documentation complète** : [GAMESCOPE_SESSION.md](GAMESCOPE_SESSION.md)

---

## 🚀 Installation

### Prérequis

```bash
# Installer Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer Go (v1.21+)
sudo apt install -y golang-go

# Installer Rust et Tauri CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
cargo install tauri-cli --version "^2.0"

# Dépendances système pour Tauri
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### Installation du projet

```bash
# Cloner le projet
cd game-launcher

# Installer les dépendances npm
npm install

# Télécharger les dépendances Go
cd src-go && go mod download && cd ..

# Compiler le backend Go
./build-backend.sh
```

## 🎮 Utilisation

### Mode développement (sans Tauri)

Le script `dev.sh` lance le backend Go et le frontend Vue séparément :

```bash
./dev.sh
```

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:1420`
- WebSocket: `ws://localhost:8080/ws`

### Mode développement (avec Tauri)

```bash
npm run tauri:dev
```

Lance l'application Tauri complète avec le sidecar Go intégré.

### Build de production

```bash
# Compiler le backend
./build-backend.sh

# Build Tauri
npm run tauri:build
```

L'exécutable sera dans `src-tauri/target/release/`.

## 🎮 Utilisation

### Navigation au gamepad (recommandé)

Le launcher est **gamepad-first** pour une expérience console optimale :

- **D-pad / Stick gauche** : Navigation dans la grille
- **Bouton Ⓐ** : Lancer le jeu sélectionné
- **Bouton Ⓑ** : Retour
- **START** : Menu

**Manettes supportées** : Xbox, PlayStation, Switch Pro, 8BitDo, Steam Controller et toute manette standard.

👉 Voir la [documentation complète du support gamepad](GAMEPAD.md)

### Navigation au clavier (fallback)

- **↑ ↓ ← →** : Navigation dans la grille
- **Entrée** : Lancer le jeu sélectionné
- **Échap** : Quitter (à implémenter)

## 🔧 Configuration

### Fenêtre sans bordures (tauri.conf.json)

```json
{
  "app": {
    "windows": [{
      "decorations": false,
      "fullscreen": false
    }]
  }
}
```

### Sidecar Go (tauri.conf.json)

```json
{
  "plugins": {
    "shell": {
      "sidecar": [{
        "name": "game-launcher-backend",
        "src": "binaries/game-launcher-backend"
      }]
    }
  }
}
```

Le nom du binaire suit le format Tauri : `game-launcher-backend-{triplet}`.

Exemple: `game-launcher-backend-x86_64-unknown-linux-gnu`

## 📡 Communication WebSocket

### Frontend → Backend

```typescript
// Lancer un jeu
ws.send(JSON.stringify({
  type: 'launch_game',
  game_id: '1'
}))
```

### Backend → Frontend

```json
// Liste des jeux
{
  "type": "game_list",
  "games": [
    {
      "id": "1",
      "title": "Half-Life 2",
      "executable": "/usr/games/hl2"
    }
  ]
}

// Résultat de lancement
{
  "type": "launch_result",
  "game_id": "1",
  "status": "success"
}
```

## 🎯 État actuel

### ✅ Production Ready

Le Game Launcher est maintenant **prêt pour une utilisation réelle** comme launcher de jeux principal !

**Fonctionnalités complètes** :
- [x] **Support game stores** - Heroic (Epic/GOG/Amazon) + Steam
- [x] **Navigation gamepad** - D-pad, sticks, boutons (façon console)
- [x] **Navigation clavier** - Fallback complet
- [x] **Cycle de vie des jeux** - Lancement, monitoring, détection de fin
- [x] **Gestion du focus** - Masquage/affichage automatique
- [x] **Bouton Home/PS** - Retour au launcher pendant le jeu 🏠
- [x] **Session Gamescope** - Mode console complet 🆕
  - Installation en tant que session système
  - Sélectionnable au login (comme KDE/GNOME)
  - Plein écran natif via Gamescope
  - Menu système intégré (logout/reboot/poweroff)
  - Auto-login optionnel
- [x] **Interface moderne** - Vue 3 + Tailwind
- [x] **Communication temps réel** - WebSocket bidirectionnel

### 🎮 Expérience Console

Le launcher offre maintenant une **vraie expérience console** :
- ✅ Boot direct dans le launcher (avec auto-login)
- ✅ Aucun desktop visible
- ✅ Navigation 100% gamepad
- ✅ Poweroff/reboot depuis l'interface
- ✅ Performance maximale (session dédiée Gamescope)

### 🔜 Améliorations futures

1. **Covers de jeux**
   ```
   "Télécharge et affiche les covers depuis SteamGridDB"
   ```

2. **Overlay pendant le jeu**
   ```
   "Ajoute un overlay pour screenshots et stats"
   ```

3. **Cloud saves**
   ```
   "Synchronisation automatique des sauvegardes"
   ```

## 🐛 Débogage

### Vérifier le backend

```bash
curl http://localhost:8080/health
```

### Logs du sidecar

En mode dev, les logs Go apparaissent dans le terminal Tauri.

### Test WebSocket

```bash
websocat ws://localhost:8080/ws
```

## 📝 Notes techniques

### Compilation du backend

Le script `build-backend.sh` :
1. Détecte l'architecture système
2. Compile avec `CGO_ENABLED=0` (binaire statique)
3. Génère le nom selon le triplet Tauri
4. Place le binaire dans `src-tauri/binaries/`

### Store Pinia

Le `gameStore` gère :
- La connexion WebSocket
- La liste des jeux
- L'index de sélection
- La navigation clavier
- Le lancement des jeux

### Styles Tailwind

Configuration personnalisée pour le thème gaming :
- `game-bg`: Fond principal (#0f172a)
- `game-card`: Carte de jeu (#1e293b)
- `game-hover`: Survol (#334155)
- `game-selected`: Sélection (#3b82f6)

## 📄 Licence

MIT

## 🙏 Crédits

Créé avec Vue 3, Tauri, Go et beaucoup de ☕
