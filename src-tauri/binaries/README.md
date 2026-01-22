# Binaries Directory

This directory contains the external binaries (sidecars) that are bundled with PixiDen.

## Automated Setup (Recommended)

PixiDen now uses a YAML-based dependency management system for sidecars:

```bash
npm run setup:sidecars
```

This will:
1. Read version and download URLs from `scripts/dependencies.yaml`
2. Download binaries for your platform
3. Create Python wrapper scripts as fallback when binaries aren't available
4. Verify and install all sidecars with proper architecture suffixes

## Configuration

Binary versions and sources are defined in `scripts/dependencies.yaml`. To update:

1. Edit `scripts/dependencies.yaml`
2. Update version numbers or download URLs
3. Run `npm run setup:sidecars` to download new versions

The system supports:
- Direct binary downloads with optional checksum verification
- Python wrapper fallbacks for pip-installable packages
- Cross-platform builds (Linux, macOS, Windows)

## Required Binaries

The following binaries must be present with the correct architecture suffix:

- `legendary-x86_64-unknown-linux-gnu` - Legendary CLI for Epic Games Store
- `nile-x86_64-unknown-linux-gnu` - Nile CLI for Amazon Games  
- `gogdl-x86_64-unknown-linux-gnu` - GOGDL CLI for GOG Galaxy

## Manual Setup (Legacy)

For manual setup, use the legacy script:

```bash
npm run setup:sidecars:legacy
```

Or manually place binaries:

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
- Python wrappers are created automatically when native binaries aren't available
