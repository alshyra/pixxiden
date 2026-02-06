# Database Module (`src/lib/database/`)

Pure TypeScript database operations via `@tauri-apps/plugin-sql`. **No Rust code needed.**

## Architecture

```
src/lib/database/
├── GameRepository.ts    # CRUD for the `games` table
├── CacheRepository.ts   # CRUD for the `enrichment_cache` table
└── index.ts             # Exports
```

## GameRepository

Singleton access to the `games` SQLite table. All reads/writes go through here.

```typescript
import { GameRepository } from "@/lib/database";

const repo = GameRepository.getInstance();

// Read
const games = await repo.getAllGames();
const game = await repo.getGameById("epic-fortnite");
const epicGames = await repo.getGamesByStore("epic");
const count = await repo.getGamesCount();
const unenriched = await repo.getUnenrichedGames();
const recent = await repo.getRecentlyPlayed(10);
const favorites = await repo.getFavorites();
const results = await repo.searchGames("witcher");

// Write (store data — does NOT overwrite enrichment)
await repo.upsertGame(game);
await repo.upsertGames(games); // Transactional batch

// Write enrichment (sets metadata fields + enriched_at timestamp)
await repo.updateEnrichment("epic-fortnite", {
  description: "...",
  developer: "Epic Games",
  genres: ["Action", "Shooter"],
  enrichedAt: new Date().toISOString(),
});

// Write metadata (favorites, playtime)
await repo.updateMetadata("epic-fortnite", {
  isFavorite: true,
  lastPlayed: new Date().toISOString(),
});

// Delete
await repo.deleteGame("epic-fortnite");
```

### Upsert Strategy

The `upsertGame()` method uses `INSERT ... ON CONFLICT DO UPDATE`:

- **Base fields** (title, installed, paths) are always overwritten from store data
- **Enrichment fields** are NEVER overwritten — use `updateEnrichment()` instead
- **Developer** uses `COALESCE(existing, new)` to prefer enriched data

## CacheRepository

Manages the `enrichment_cache` table. API responses are cached here to avoid
re-fetching on every sync.

```typescript
import { CacheRepository } from "@/lib/database";

const cache = CacheRepository.getInstance();

// Get cached data (returns null if not found)
const igdbData = await cache.get("epic-fortnite", "igdb");

// Get only if cache is still valid (default: 7 days TTL)
const freshData = await cache.getIfValid("epic-fortnite", "igdb");

// Store data
await cache.set("epic-fortnite", "igdb", { id: 123, name: "Fortnite", ... });

// Clear
await cache.clearForGame("epic-fortnite");
await cache.clearAll();

// Stats
const stats = await cache.getStats();
// { totalEntries: 42, byProvider: { igdb: 15, steamgriddb: 12, hltb: 10, protondb: 5 } }
```

## Database Schema

Both repositories operate on the schema defined in `src/services/base/schema.ts`:

- **`games`** — Main library table with base info, metadata, assets, user data
- **`enrichment_cache`** — Keyed by `(game_id, provider)`, stores raw JSON responses
- **`auth_tokens`** — Store authentication tokens
- **`settings`** — Key-value app settings
