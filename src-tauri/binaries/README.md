# Binaries Directory

This directory contains the external binaries (sidecars) that are bundled with PixiDen.

## Required Binaries

The following binaries must be present with the correct architecture suffix:

- `legendary-x86_64-unknown-linux-gnu` - Legendary CLI for Epic Games Store
- `nile-x86_64-unknown-linux-gnu` - Nile CLI for Amazon Games
- `gogdl-x86_64-unknown-linux-gnu` - GOGDL CLI for GOG Galaxy

## Setup

Run the setup script to automatically configure the binaries:

```bash
npm run setup:sidecars
```

Or manually:

```bash
bash scripts/setup-sidecars.sh
```

## Manual Setup

If you need to manually place binaries:

1. Determine your architecture:
   ```bash
   rustc -vV | grep host | cut -d' ' -f2
   ```

2. Copy or download the binaries to this directory with the correct suffix:
   ```bash
   cp $(which legendary) binaries/legendary-x86_64-unknown-linux-gnu
   cp $(which nile) binaries/nile-x86_64-unknown-linux-gnu
   cp $(which gogdl) binaries/gogdl-x86_64-unknown-linux-gnu
   ```

3. Make them executable:
   ```bash
   chmod +x binaries/*
   ```

## Important Notes

- ⚠️ **The architecture suffix is REQUIRED** - Tauri will not bundle binaries without it
- The binaries must be executable (`chmod +x`)
- These binaries are bundled into the final AppImage/deb package
