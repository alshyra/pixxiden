#!/usr/bin/env bash
#
# reset-enrichment.sh — Developer utility to reset enrichment data or nuke the DB
#
# Use this when the enrichment pipeline or schema has changed.
#
# Modes:
#   --reset (default): Reset enrichment columns, keep games
#   --nuke:            Delete entire database + cached images (full fresh start)
#
# Usage:
#   ./scripts/reset-enrichment.sh                  # Reset enrichment
#   ./scripts/reset-enrichment.sh --nuke            # Delete DB + images
#   ./scripts/reset-enrichment.sh /path/to/db       # Custom DB path
#   ./scripts/reset-enrichment.sh --nuke /path/to/db
#

set -euo pipefail

MODE="reset"
DB=""

for arg in "$@"; do
  case "$arg" in
    --nuke) MODE="nuke" ;;
    *) DB="$arg" ;;
  esac
done

DB="${DB:-$HOME/.config/com.Pixxiden.launcher/pixxiden.db}"
CONFIG_DIR="$(dirname "$DB")"

if [ "$MODE" = "nuke" ]; then
  echo "💣 NUKE MODE — Deleting database and cached images"
  echo "   DB: $DB"
  echo "   Config dir: $CONFIG_DIR"
  echo ""

  if [ -f "$DB" ]; then
    rm -f "$DB"
    echo "   ✅ Database deleted"
  else
    echo "   ⚠️  Database not found (already clean)"
  fi

  GAMES_DIR="$CONFIG_DIR/games"
  if [ -d "$GAMES_DIR" ]; then
    rm -rf "$GAMES_DIR"
    echo "   ✅ Cached images deleted ($GAMES_DIR)"
  else
    echo "   ⚠️  No cached images found"
  fi

  echo ""
  echo "✅ Fresh start! Launch the app to recreate the database."
  exit 0
fi

if [ ! -f "$DB" ]; then
  echo "❌ Database not found: $DB"
  echo "   Usage: $0 [/path/to/pixxiden.db]"
  exit 1
fi

echo "🔧 Resetting enrichment data in: $DB"
echo ""

# Show current state
TOTAL=$(sqlite3 "$DB" "SELECT COUNT(*) FROM games;")
ENRICHED=$(sqlite3 "$DB" "SELECT COUNT(*) FROM games WHERE enriched_at IS NOT NULL;")
CACHE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM enrichment_cache;")
echo "   Current state:"
echo "     Games:    $TOTAL"
echo "     Enriched: $ENRICHED"
echo "     Cache:    $CACHE entries"
echo ""

# Confirm
read -p "⚠️  This will reset ALL enrichment data. Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "🗑  Clearing enrichment_cache..."
sqlite3 "$DB" "DELETE FROM enrichment_cache;"

echo "🔄 Resetting enriched_at and enrichment columns..."
sqlite3 "$DB" "
  UPDATE games SET
    enriched_at = NULL,
    description = NULL,
    summary = NULL,
    metacritic_score = NULL,
    igdb_rating = NULL,
    developer = CASE WHEN developer IS NOT NULL AND developer != '' THEN developer ELSE NULL END,
    publisher = NULL,
    genres = '[]',
    release_date = NULL,
    hltb_main = NULL,
    hltb_main_extra = NULL,
    hltb_complete = NULL,
    hltb_speedrun = NULL,
    proton_tier = NULL,
    proton_confidence = NULL,
    proton_trending_tier = NULL,
    steam_app_id = NULL,
    hero_path = NULL,
    grid_path = NULL,
    logo_path = NULL,
    icon_path = NULL,
    screenshot_paths = '[]',
    updated_at = datetime('now');
"

# Show final state
ENRICHED_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM games WHERE enriched_at IS NOT NULL;")
CACHE_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM enrichment_cache;")
echo ""
echo "✅ Done!"
echo "   Games:    $TOTAL (unchanged)"
echo "   Enriched: $ENRICHED_AFTER (was $ENRICHED)"
echo "   Cache:    $CACHE_AFTER entries (was $CACHE)"
echo ""
echo "➡️  Launch the app and sync to re-enrich all games."
