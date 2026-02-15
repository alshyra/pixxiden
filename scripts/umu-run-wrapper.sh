#!/bin/bash
# umu-run wrapper: launches games via umu-run with proper Steam Input support
#
# Expected environment variables:
#   GAMEID: umu-{store}-{storeId} (e.g., umu-gog-1456460669)
#   STORE: gog, epic, steam, etc.
#   PROTONPATH: path to Proton installation (without /proton suffix)
#   WINEPREFIX: path to Wine prefix
#
# Arguments: path-to-game-executable [additional-args...]

set -e

if [ -z "$GAMEID" ] || [ -z "$STORE" ] || [ -z "$PROTONPATH" ] || [ -z "$WINEPREFIX" ]; then
  echo "Error: Missing required environment variables" >&2
  exit 1
fi

GAME_EXE="${1:?Error: Game executable path required}"

if [ ! -f "$GAME_EXE" ]; then
  echo "Error: Executable not found: $GAME_EXE" >&2
  exit 1
fi

# Ensure PROTONPATH doesn't end with /proton
PROTONPATH="${PROTONPATH%/proton}"

# Launch with umu-run
exec /usr/bin/umu-run "$GAME_EXE"
