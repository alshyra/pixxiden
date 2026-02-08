# System Prerequisites

Pixxiden uses **Proton-GE** (a Wine-based compatibility layer) to run Windows games on Linux.
Proton requires **32-bit (i386) system libraries** that cannot be bundled in the AppImage — they must be installed system-wide because they interact directly with the kernel, GPU drivers, and display server.

> **Note:** If you install the `.deb` package, these dependencies are declared automatically and will be installed by `apt`.

## Quick Install

### Ubuntu / Debian / Linux Mint / Pop!\_OS

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install \
  libc6:i386 \
  libgl1:i386 \
  libfreetype6:i386 \
  libx11-6:i386 \
  libxext6:i386 \
  libxrandr2:i386 \
  libxrender1:i386 \
  libxcursor1:i386 \
  libxi6:i386 \
  libxcomposite1:i386 \
  libxinerama1:i386 \
  libasound2t64:i386 \
  libfontconfig1:i386 \
  libpulse0:i386 \
  libdbus-1-3:i386
```

### Fedora

```bash
sudo dnf install \
  glibc.i686 \
  mesa-libGL.i686 \
  freetype.i686 \
  libX11.i686 \
  libXext.i686 \
  libXrandr.i686 \
  libXrender.i686 \
  libXcursor.i686 \
  libXi.i686 \
  libXcomposite.i686 \
  libXinerama.i686 \
  alsa-lib.i686 \
  fontconfig.i686 \
  pulseaudio-libs.i686 \
  dbus-libs.i686
```

### Arch Linux / Manjaro

Enable `[multilib]` in `/etc/pacman.conf` first, then:

```bash
sudo pacman -S \
  lib32-glibc \
  lib32-mesa \
  lib32-freetype2 \
  lib32-libx11 \
  lib32-libxext \
  lib32-libxrandr \
  lib32-libxrender \
  lib32-libxcursor \
  lib32-libxi \
  lib32-libxcomposite \
  lib32-libxinerama \
  lib32-alsa-lib \
  lib32-fontconfig \
  lib32-libpulse \
  lib32-dbus
```

### SteamOS / Steam Deck

No action needed — SteamOS ships with all 32-bit libraries pre-installed.

## What Pixxiden Checks

At launch time, Pixxiden verifies the presence of these critical 32-bit libraries:

| Library            | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `ld-linux.so.2`    | 32-bit dynamic linker — required to run ANY 32-bit binary |
| `libGL.so.1`       | OpenGL rendering — required for 3D games                  |
| `libfreetype.so.6` | Font rendering — required by Wine for text display        |
| `libX11.so.6`      | X11 display protocol — required for windowed games        |

If any of these are missing, Pixxiden will display an error with install instructions **before** attempting to launch the game.

## Why Not Bundle in AppImage?

These libraries cannot be embedded in the AppImage for several reasons:

1. **Kernel ABI coupling**: `libc6:i386` must match the host kernel's 32-bit syscall interface
2. **GPU driver coupling**: `libGL:i386` must match the host GPU driver (NVIDIA, AMD, Intel)
3. **Size**: The full set of 32-bit dependencies is 500MB+ — larger than the entire AppImage
4. **Display server coupling**: X11/Wayland libraries must match the host compositor

This is the same approach used by **Steam**, **Lutris**, and **Heroic Games Launcher** — all document 32-bit library prerequisites as system requirements.

## Verification

To verify your system is ready, run:

```bash
# Check 32-bit linker
file /lib/ld-linux.so.2 || file /usr/lib32/ld-linux.so.2

# Check 32-bit OpenGL
ldconfig -p | grep "libGL.so.1.*i386\|libGL.so.1.*32"

# Check freetype
ldconfig -p | grep "libfreetype.so.6.*i386\|libfreetype.so.6.*32"
```

If all commands return results, your system is ready for Proton gaming.
