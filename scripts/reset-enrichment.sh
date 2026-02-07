#!/usr/bin/env bash
#
# reset-enrichment.sh — Developer utility to reset all enrichment data
#
# Use this when the enrichment pipeline has changed and you want to
# force a full re-enrichment on the next app sync.
#
# What it does:
#   1. Deletes ALL entries from enrichment_cache
#   2. Resets enriched_at to NULL for ALL games
#   3. Resets enrichment columns (hltb_*, proton_*, steam_app_id) to defaults
#
# The games themselves (id, title, store, installed) are NOT touched.
#
# Usage:
#   ./scripts/reset-enrichment.sh         # Uses default DB path
#   ./scripts/reset-enrichment.sh /path/to/pixxiden.db
#

set -euo pipefail

DB="${1:-$HOME/.config/com.Pixxiden.launcher/pixxiden.db}"

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
    cover_path = NULL,
    grid_path = NULL,
    logo_path = NULL,
    icon_path = NULL,
    screenshot_paths = '[]',
    cover_url = NULL,
    background_url = NULL,
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
