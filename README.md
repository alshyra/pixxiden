# Pixxiden 🎮

**A cozy, modern game library launcher for Linux.** Manage Epic, GOG, Amazon, and Steam games in one beautiful, controller-friendly interface.

---

## ✨ Features

* **Native Stores**: Direct login for Epic, GOG, and Amazon (no Heroic required).
* **Session Mode**: Full-screen Wayland/Gamescope experience (SteamOS style).
* **Gamepad Ready**: Full controller support with haptics.
* **Smart Integration**: Auto-detects Wine/Proton; tracks playtime and metadata.
* **Modern UI**: Sleek glowing dark theme.

## 🚀 Quick Start

### 1. Requirements

* **System**: Node.js 18+, Rust.

### 2. Setup & Dev

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### 3. Build (AppImage)

```bash
npm run tauri:build
```

## 🛠️ Installation

**Debian/Ubuntu:**
`sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

**Arch:**
`sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg base-devel`

If the build fails with linuxdeploy errors related to `.relr.dyn` sections, this is due to modern system libraries not being recognized by linuxdeploy's old `strip` tool. The build scripts already include `NO_STRIP=1` to work around this.

If the build fails for other reasons, you can try refreshing the cached `linuxdeploy`:

```bash
rm ~/.cache/tauri/linuxdeploy-x86_64.AppImage
wget https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage -O ~/.cache/tauri/linuxdeploy-x86_64.AppImage
chmod +x ~/.cache/tauri/linuxdeploy-x86_64.AppImage
```

## 🎮 Usage

1. **Launch** Pixxiden.
2. Go to **Settings → Accounts → Manage Stores**.
3. Connect your accounts (OAuth or Login).
4. **Play.**

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Heroic Games Launcher](https://heroicgameslauncher.com/) for CLI tools
- [ReMiX Theme](https://github.com/jonosellier/ReMiX_jonosellier) for design inspiration
- Linux gaming community

**Made with ❤️ for the Linux gaming community.**
