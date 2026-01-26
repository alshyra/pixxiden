# Pixxiden 🎮

> A cozy, modern game library launcher for Linux with multi-store support and session mode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)

## 🌟 Features

- **🔐 Direct Store Authentication**: Connect to Epic, GOG, and Amazon Games directly from PixiDen (no Heroic required!)
- **Multi-Store Support**: Seamlessly manage games from Epic Games Store, GOG, Amazon Games, and Steam
- **Session Mode**: Run as a dedicated gaming session with Wayland/Gamescope (SteamOS-like experience)
- **Controller Navigation**: Full gamepad support with haptic feedback
- **Wine/Proton Integration**: Automatic runner detection and management
- **Modern UI**: Beautiful ReMiX-inspired dark theme with smooth animations
- **Download Manager**: Queue management, bandwidth limiting, pause/resume support
- **Play Time Tracking**: Monitor your gaming sessions
- **Metadata Rich**: Automatic game info, covers, and screenshots
- **Heroic Compatible**: Share authentication configs with Heroic Games Launcher

## 🏗️ Architecture

Pixxiden uses a modern, modular architecture:

```
┌─────────────────────────────────────────┐
│  Frontend (Tauri + Vue.js)              │
│  - ReMiX Theme UI                       │
│  - Controller Support                   │
│  - IPC Communication                    │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **Rust** (for Tauri)
- **Wine-GE** or **Proton-GE** (optional, can be bundled)
- **Store CLIs** (for authentication):
  - `legendary-gl` (Epic Games)
  - `gogdl` (GOG)
  - `nile` (Amazon Games)

### Install Store CLIs

```bash
# Install all store authentication CLIs
pip install legendary-gl gogdl nile

# Or check which ones are already installed
./scripts/check-clis.sh
```

### Setup

Install dependencies:

```bash
# On Debian/Ubuntu-based systems
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libudev-dev
```

```bash
sudo pacman -S \
  webkit2gtk-4.1 \
  gtk3 \
  glib2 \
  libsoup3 \
  librsvg \
  libayatana-appindicator \
  openssl \
  base-devel
```

```bash
npm i
npm run tauri dev
```

## 🎮 Usage

### First Launch

1. Launch PixiDen
2. Go to **Settings → Comptes → Gérer les Stores**
3. Connect your game stores:
   - **Epic Games**: Click "Se connecter" → Browser opens → Login
   - **GOG**: Click "Se connecter" → Copy/paste authentication code
   - **Amazon Games**: Click "Se connecter" → Enter email/password (+ 2FA if enabled)
4. Return to Library → Your games will sync automatically

### Store Authentication

PixiDen can authenticate directly with game stores, making Heroic Games Launcher optional. See [STORE_AUTH.md](STORE_AUTH.md) for detailed documentation.

**Features**:

- ✅ Independent authentication (no Heroic required)
- ✅ Compatible with existing Heroic configs
- ✅ Controller-optimized interface
- ✅ Secure OAuth flows

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Heroic Games Launcher](https://heroicgameslauncher.com/) for CLI tools
- [ReMiX Theme](https://github.com/jonosellier/ReMiX_jonosellier) for design inspiration
- Linux gaming community

---

**Made with ❤️ for the Linux gaming community**
