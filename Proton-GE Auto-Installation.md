# Prompt: Proton-GE Auto-Installation

## Context

Install Proton-GE automatically for running Windows games. User sees nothing, everything happens in background.

---

## Installation Path

```
~/.local/share/pixxiden/runners/GE-Proton{VERSION}/
```

**Not** Steam's compatibilitytools.d - use Pixxiden's own directory.

---

## Auto-Install Flow

### On App First Launch

1. Check if Proton-GE exists in `~/.local/share/pixxiden/runners/`
2. If NO → Download and install latest version (silent)
3. If YES → Use existing version
4. Save path in database or config

### Silent Installation

- No user prompt
- No confirmation dialog
- Show progress in splash screen or background
- Happens once, first time only

---

## GitHub API

### Get Latest Release

**Endpoint:** `GET https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases/latest`

**Response:**

```json
{
  "tag_name": "GE-Proton9-15",
  "assets": [
    {
      "name": "GE-Proton9-15.tar.gz",
      "browser_download_url": "https://github.com/.../GE-Proton9-15.tar.gz",
      "size": 536870912
    }
  ]
}
```

### Direct Download

Extract `browser_download_url` from assets, download the `.tar.gz` file.

**Size:** ~500-600 MB

---

## Installation Steps

1. **Download tarball** to temp directory
2. **Extract** to `~/.local/share/pixxiden/runners/`
3. **Delete** tarball after extraction
4. **Save** path to Proton binary in config/database

**Resulting structure:**

```
~/.local/share/pixxiden/runners/
└── GE-Proton9-15/
    ├── proton          ← Binary to use with legendary
    ├── files/
    └── ...
```

---

## Configuration Storage

### Database (games table already has these fields)

```sql
wine_version: "~/.local/share/pixxiden/runners/GE-Proton9-15/proton"
wine_prefix: "~/.local/share/pixxiden/prefixes/{store}/{game_id}"
```

### Or Global Config

```json
{
  "proton_ge_path": "~/.local/share/pixxiden/runners/GE-Proton9-15/proton",
  "proton_ge_version": "GE-Proton9-15",
  "installed_at": 1234567890
}
```

---

## Usage with Legendary

```bash
legendary launch <game_id> \
  --wine ~/.local/share/pixxiden/runners/GE-Proton9-15/proton \
  --wine-prefix ~/.local/share/pixxiden/prefixes/epic/<game_id>
```

Set these as defaults for each game on first launch.

## Usage with GOGDL

```bash
gogdl launch --platform windows \
  --wine ~/.local/share/pixxiden/runners/GE-Proton9-15/proton \
  --wine-prefix ~/.local/share/pixxiden/prefixes/gog/<game_id> <game_path> <game_id>
```

---

## Update Strategy

### Option 1: Keep Latest Only

- Check for updates periodically (weekly/monthly)
- If new version → download and replace old one
- Delete old version after successful install

is this ok with prefix though ?
for now:
save the proton version in the database for the installed game
for new game to install use the latest version available at that time

---

## Error Handling

### Download Fails

- Log error
- Retry once
- If still fails: Show error message, offer manual download link

### Extraction Fails

- Same as download failure
- Clean up partial files

### Disk Space

- Check available space before download (~1 GB free required)
- If insufficient: Show error, don't attempt download

---

## UI/UX

### During Installation

Show in splash screen or as subtle notification:

```
Setting up Pixxiden...
Downloading game runner... (45%)
```

### After Installation

Nothing. User never knows it happened.

### If Download Fails

Toast notification:

```
Failed to download Proton-GE. Windows games won't work.
[Retry] [Learn More]
```

---

## Implementation Notes

- Use Tauri's `@tauri-apps/plugin-http` for download
- Use `tar` command via `@tauri-apps/plugin-shell` for extraction
- Store installation state to avoid re-downloading
- Network failure is acceptable - just log and move on
- Don't block app launch on Proton install

---

## Prefixes

### Create per game

```
~/.local/share/pixxiden/prefixes/
├── epic/
│   ├── fortnite/
│   └── fall-guys/
├── gog/
│   └── witcher3/
└── ...
```

Each game gets its own Wine prefix to avoid conflicts.

Prefix is created automatically by Wine/Proton on first game launch.

---

## Success Criteria

1. User installs Pixxiden
2. User adds Epic Games account
3. User clicks "Play" on a Windows game
4. Game launches ✅

**User never saw anything about Proton/Wine/runners**
