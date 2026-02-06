# Sync Module (`src/lib/sync/`)

Main game synchronization orchestrator. Coordinates store fetching, enrichment, and SQLite persistence — **entirely in TypeScript**.

## Architecture

```
src/lib/sync/
├── GameSyncService.ts   # Main sync orchestrator
└── index.ts             # Exports
```

## GameSyncService

Singleton service that handles the complete sync pipeline:

```
Store CLIs → Game[] → SQLite (base data) → EnrichmentService → SQLite (enriched data)
                                    ↳ emit('splash-progress') at each step
```

### Usage

```typescript
import { GameSyncService } from "@/lib/sync";

const sync = GameSyncService.getInstance();

// Full sync (all stores)
const result = await sync.sync();

// Sync specific stores
const result = await sync.sync({ stores: ["epic", "gog"] });

// Force re-enrichment
const result = await sync.sync({ forceEnrich: true });

// Skip enrichment (faster, just fetch store data)
const result = await sync.sync({ skipEnrichment: true });
```

### SyncResult

```typescript
interface SyncResult {
  total: number; // Total games processed
  added: number; // New games added
  updated: number; // Existing games updated
  enriched: number; // Games enriched with metadata
  errors: SyncError[];
  duration: number; // Total time in ms
}
```

### Progress Events

During sync, the service emits Tauri events for UI updates:

```typescript
// Listen in any Vue component or script:
import { listen } from "@tauri-apps/api/event";

const unlisten = await listen("splash-progress", (event) => {
  const { store, gameTitle, current, total, phase, message } = event.payload;
  // phase: "fetching" | "enriching" | "complete"
});
```

## Sync Flow

### Phase 1: Store Fetching

For each store (Epic, GOG, Amazon, Steam):

1. Check authentication status
2. If authenticated, call `store.listGames()` (runs CLI sidecar)
3. Persist base game data to SQLite via `GameRepository.upsertGames()`
4. Emit progress events

### Phase 2: Enrichment

For each unenriched game:

1. Configure API keys (IGDB OAuth token, SteamGridDB key)
2. Call `EnrichmentService.enrichGame()` (checks cache first)
3. Persist enrichment data to SQLite via `GameRepository.updateEnrichment()`
4. Emit progress events

### Caching Strategy

Two levels of caching:

1. **Sync level**: Skip games where `enriched_at IS NOT NULL` (unless `forceEnrich: true`)
2. **API level**: `EnrichmentService` checks `enrichment_cache` table before hitting APIs (7-day TTL)

### Error Handling

- Store fetch failures are logged and skipped (don't block other stores)
- Enrichment failures are logged and skipped (don't block other games)
- All errors are collected in `SyncResult.errors`
- The sync never crashes — always returns a result

## Integration

### SplashScreen

The splash screen calls `sync()` on first load (when no games exist) and listens to progress events.

### Library Store

The Pinia library store delegates sync to the orchestrator, which delegates to `GameSyncService`.

### Manual Re-sync

Users can trigger re-sync from settings or library UI via `useLibraryStore().syncLibrary()`.
