#!/usr/bin/env bash
#
# validate-db.sh — Developer utility to validate enrichment data integrity
#
# Checks that all enrichment columns are properly populated after a sync.
# Returns exit code 0 if all checks pass, 1 if any fail.
#
# Usage:
#   ./scripts/validate-db.sh              # Uses default DB path
#   ./scripts/validate-db.sh /path/to/pixxiden.db
#

set -uo pipefail

DB="${1:-$HOME/.config/com.Pixxiden.launcher/pixxiden.db}"

if [ ! -f "$DB" ]; then
  echo "❌ Database not found: $DB"
  exit 1
fi

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local result
  result=$(sqlite3 "$DB" "$query")

  if [ "$result" = "$expected" ]; then
    echo "  ✅ $label: $result"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label: $result (expected: $expected)"
    FAIL=$((FAIL+1))
  fi
}

check_gt() {
  local label="$1"
  local query="$2"
  local threshold="$3"
  local result
  result=$(sqlite3 "$DB" "$query")

  if [ "$result" -gt "$threshold" ] 2>/dev/null; then
    echo "  ✅ $label: $result"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label: $result (expected > $threshold)"
    FAIL=$((FAIL+1))
  fi
}

check_warn() {
  local label="$1"
  local query="$2"
  local threshold="$3"
  local result
  result=$(sqlite3 "$DB" "$query")

  if [ "$result" -gt "$threshold" ] 2>/dev/null; then
    echo "  ✅ $label: $result"
    PASS=$((PASS+1))
  else
    echo "  ⚠️  $label: $result (expected > $threshold, some games may not have this data)"
    WARN=$((WARN+1))
  fi
}

TOTAL=$(sqlite3 "$DB" "SELECT COUNT(*) FROM games;")
echo "🔍 Validating enrichment data in: $DB"
echo "   Total games: $TOTAL"
echo ""

# ===== Basic data =====
echo "📋 Base data:"
check_gt "Games exist" "SELECT COUNT(*) FROM games;" 0
check "All have store_id" "SELECT COUNT(*) FROM games WHERE store_id IS NULL OR store_id = '';" "0"
check "All have title" "SELECT COUNT(*) FROM games WHERE title IS NULL OR title = '';" "0"

# ===== Enrichment status =====
echo ""
echo "🔄 Enrichment status:"
ENRICHED=$(sqlite3 "$DB" "SELECT COUNT(*) FROM games WHERE enriched_at IS NOT NULL;")
echo "  📊 Enriched: $ENRICHED / $TOTAL"
check "All games enriched" "SELECT COUNT(*) FROM games WHERE enriched_at IS NULL;" "0"

# ===== IGDB metadata =====
echo ""
echo "🎮 IGDB metadata:"
check "All have description" "SELECT COUNT(*) FROM games WHERE enriched_at IS NOT NULL AND (description IS NULL OR description = '');" "0"
check_gt "Most have igdb_rating > 0" "SELECT COUNT(*) FROM games WHERE igdb_rating > 0;" 0
check_gt "Some have metacritic_score > 0" "SELECT COUNT(*) FROM games WHERE metacritic_score > 0;" 0
check_gt "Most have developer" "SELECT COUNT(*) FROM games WHERE developer IS NOT NULL AND developer != '';" 0
check_gt "Most have publisher" "SELECT COUNT(*) FROM games WHERE publisher IS NOT NULL AND publisher != '';" 0
check_gt "Most have genres" "SELECT COUNT(*) FROM games WHERE genres != '[]' AND genres IS NOT NULL;" 0
check_gt "Most have release_date" "SELECT COUNT(*) FROM games WHERE release_date IS NOT NULL;" 0

# ===== Time to beat (from IGDB game_time_to_beats) =====
echo ""
echo "⏱️  Time to beat (IGDB game_time_to_beats):"
check_warn "Games with hltb_main > 0" "SELECT COUNT(*) FROM games WHERE hltb_main > 0;" 0
check_warn "Games with hltb_main_extra > 0" "SELECT COUNT(*) FROM games WHERE hltb_main_extra > 0;" 0
check_warn "Games with hltb_complete > 0" "SELECT COUNT(*) FROM games WHERE hltb_complete > 0;" 0

# ===== Steam App ID & ProtonDB =====
echo ""
echo "🐧 Steam App ID & ProtonDB:"
check_warn "Games with steam_app_id" "SELECT COUNT(*) FROM games WHERE steam_app_id IS NOT NULL AND steam_app_id > 0;" 0
check_warn "Games with proton_tier" "SELECT COUNT(*) FROM games WHERE proton_tier IS NOT NULL AND proton_tier != 'pending' AND proton_tier != '';" 0

# ===== Assets =====
echo ""
echo "🖼️  Assets:"
check_gt "Games with hero_path" "SELECT COUNT(*) FROM games WHERE hero_path IS NOT NULL AND hero_path != '';" 0
check_gt "Games with grid_path" "SELECT COUNT(*) FROM games WHERE grid_path IS NOT NULL AND grid_path != '';" 0
check_gt "Games with screenshots" "SELECT COUNT(*) FROM games WHERE screenshot_paths != '[]' AND screenshot_paths IS NOT NULL;" 0

# ===== Cache =====
echo ""
echo "💾 Enrichment cache:"
CACHE_TOTAL=$(sqlite3 "$DB" "SELECT COUNT(*) FROM enrichment_cache;")
CACHE_VERSIONED=$(sqlite3 "$DB" "SELECT COUNT(*) FROM enrichment_cache WHERE data LIKE '%_cacheVersion%';")
echo "  📊 Cache entries: $CACHE_TOTAL (versioned: $CACHE_VERSIONED)"
if [ "$CACHE_TOTAL" -gt 0 ]; then
  check "All cache entries versioned" "SELECT COUNT(*) FROM enrichment_cache WHERE data NOT LIKE '%_cacheVersion%';" "0"
fi

# ===== Sample game =====
echo ""
echo "🎯 Sample game:"
sqlite3 -header -column "$DB" "
  SELECT id, title, igdb_rating, metacritic_score, developer, hltb_main, hltb_main_extra, hltb_complete, steam_app_id, proton_tier
  FROM games
  WHERE enriched_at IS NOT NULL
  LIMIT 3;
"

# ===== Summary =====
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  ⚠️  Warnings: $WARN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "❌ Some checks FAILED. Enrichment data is incomplete."
  exit 1
else
  echo ""
  echo "✅ All checks passed!"
  exit 0
fi
