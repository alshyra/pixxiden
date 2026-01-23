# Pixxiden 🎮

> A cozy, modern game library launcher for Linux with multi-store support and session mode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://go.dev/)
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

### Frontend Setup

```bash
cd frontend
npm install
npm run tauri dev
```

## 🎮 Usage

Launch Pixxiden from your application menu or:

```bash
Pixxiden
```

For session mode:
```bash
Pixxiden-session  # Launches with Gamescope
```

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Heroic Games Launcher](https://heroicgameslauncher.com/) for CLI tools
- [ReMiX Theme](https://github.com/jonosellier/ReMiX_jonosellier) for design inspiration
- Linux gaming community

---

**Made with ❤️ for the Linux gaming community**
