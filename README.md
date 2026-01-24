# Pixxiden 🎮

> A cozy, modern game library launcher for Linux with multi-store support and session mode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)

## 🌟 Features

- **Multi-Store Support**: Seamlessly manage games from Epic Games Store, GOG, and Amazon Games
- **Session Mode**: Run as a dedicated gaming session with Wayland/Gamescope (SteamOS-like experience)
- **Controller Navigation**: Full gamepad support with haptic feedback
- **Wine/Proton Integration**: Automatic runner detection and management
- **Modern UI**: Beautiful ReMiX-inspired dark theme with smooth animations
- **Download Manager**: Queue management, bandwidth limiting, pause/resume support
- **Play Time Tracking**: Monitor your gaming sessions
- **Metadata Rich**: Automatic game info, covers, and screenshots

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



## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Heroic Games Launcher](https://heroicgameslauncher.com/) for CLI tools
- [ReMiX Theme](https://github.com/jonosellier/ReMiX_jonosellier) for design inspiration
- Linux gaming community

---

**Made with ❤️ for the Linux gaming community**
