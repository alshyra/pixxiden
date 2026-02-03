# Pixxiden AI Agent Instructions

## Project Overview

**Pixxiden** is a cozy, modern game library launcher for Linux that consolidates Epic Games, GOG, Amazon Games, and Steam libraries. Built with **Tauri 2** (Rust backend) + **Vue 3** (TypeScript frontend), it provides a controller-friendly, fullscreen experience for managing and launching games.

## Architecture

### Hybrid Rust-TypeScript Design (JS-First)

- **JS-First Architecture**: We prioritize JS/TS for business logic (auth, enrichment, orchestration) because Tauri's Rust documentation is often insufficient. Rust is strictly for system-level operations and I/O.
- **Rust backend** (`src-tauri/`): System operations, game launching, database persistence, Tauri commands
- **TypeScript frontend** (`src/`): Main business logic, Vue UI components
- **External CLIs** (sidecars): `legendary` (Epic), `gogdl` (GOG), `nile` (Amazon), native Steam integration
- **Data persistence**: SQLite via `@tauri-apps/plugin-sql` (TypeScript) + Rust `Database` service

### Service Architecture Pattern

The codebase follows a **layered service architecture** with clear separation:

```
Vue Components (src/components/, src/views/)
    ↓
Pinia Stores (src/stores/library.ts, src/stores/auth.ts)
    ↓
GameLibraryOrchestrator (src/services/GameLibraryOrchestrator.ts)
    ↓
Store Services (src/services/stores/*Service.ts)
    ↓ (via SidecarService)
External CLIs (legendary, gogdl, nile)
```

**Key services:**

- `GameLibraryOrchestrator`: Central coordinator for game library operations (sync, fetch, enrichment)
- `GameStoreService`: Abstract base class for store integrations (Legendary, Gogdl, Nile, Steam)
- `EnrichmentService`: Fetches metadata (covers, descriptions) from IGDB/SteamGridDB APIs
- `SidecarService`: Wrapper for executing external CLI binaries
- `DatabaseService`: TypeScript wrapper for SQLite operations
- `AuthService`: Manages store authentication flows

**Critical pattern:** All store services extend `GameStoreService` and use **sidecar + database** dependency injection.

### Tauri Command Bridge

Frontend calls Rust backend via `invoke()` from `@tauri-apps/api/core`:

```typescript
// Frontend (TypeScript)
const games = await invoke<Game[]>("get_games");
const status = await invoke<StoreStatus[]>("get_store_status", { state });
```

Rust commands are in `src-tauri/src/commands/*.rs` and registered in `src-tauri/src/lib.rs`. Use `#[tauri::command]` macro for command definition.

## Development Workflows

### Setup & Running

**Package Manager:** Use `bun` for all commands.

```bash
bun install                  # Downloads CLIs via postinstall.js (scripts/postinstall.js)
bun run tauri:dev            # Dev mode with hot reload (uses tauri.dev.conf.json)
bun run tauri:build          # Production AppImage build
bun run setup:sidecars       # Manually re-download CLI binaries if needed
```

**Critical:** `scripts/postinstall.js` downloads platform-specific binaries (legendary, gogdl, nile) based on `scripts/dependencies.yaml`. These are bundled as `externalBin` in `tauri.conf.json`.

### Testing

**Unit tests** (Vitest):

```bash
bun run test              # Watch mode
bun run test:run          # Single run
bun run test:coverage     # With coverage
```

- Config: `vitest.config.ts`
- Files: `src/**/*.{test,spec}.ts` or `tests/**/*.{test,spec}.ts`
- Environment: `happy-dom` (lightweight DOM)

**E2E tests** (WebdriverIO + Tauri WebDriver):

```bash
bun run test:e2e          # Run all E2E scenarios
bun run test:e2e:headless # Headless mode
bun run test:build        # Build + E2E (full pipeline)
```

- **Pattern**: Use **Page Object Model (POM)** and **Scenarios** to separate business rules from implementation.
- **Location**: Scenarios in `e2e/scenarios/`, Page Objects in `e2e/page-objects/`.
- **Must build first:** E2E tests run against `src-tauri/target/release/Pixxiden` binary.
- **AI Agent Rule**: Never pipe test commands (e.g., `bun run test | cat`). Errors might be hidden. Prefer polling or direct execution.

### Code Quality

```bash
bun run lint              # oxlint with auto-fix
bun run type-check        # TypeScript check without emit
bun run validate          # Full check: type-check + lint + tests
```

Uses **oxlint** (fast Rust-based linter) instead of ESLint. No Prettier—rely on oxlint formatting.

## Project Conventions

### TypeScript & Vue Patterns

1. **API Setup**: Always use `<script setup>` for Vue components and the "Setup Store" syntax for Pinia stores.

2. **Component Architecture**:
   - **Autonomy**: Components must be autonomous. Avoid deep inheritance or tight coupling between parents and children.
   - **UI Components**: Use **Props** for data exchange in pure UI components.
   - **Business Components**: Prefer **Pinia Stores** for data exchange in business-logic heavy components.

3. **Singleton services**: All services use `getInstance()` pattern for shared state

   ```typescript
   export class DatabaseService {
     private static instance: DatabaseService | null = null;
     static getInstance(): DatabaseService { ... }
   }
   ```

4. **Type imports**: Use `type` keyword for type-only imports

   ```typescript
   import type { Game, StoreType } from "@/types";
   ```

5. **Path aliases**: `@/` resolves to `src/` (configured in `tsconfig.json` and `vite.config.ts`)

6. **Vue composables**: Prefix with `use*` (see `src/composables/`)
   - `useGamepad()`: Controller input handling with haptics
   - `useFocusNavigation()`: Grid-based keyboard/gamepad navigation
   - `useCurrentGame()`: Access current game context

### Rust Patterns

1. **Tauri commands**: Always async, return `Result<T, String>` for error handling

   ```rust
   #[tauri::command]
   pub async fn get_games() -> Result<Vec<Game>, String> { ... }
   ```

2. **State management**: Use `State<'_, AppState>` for shared app state (adapters, database)

3. **Database operations**: Prefer `src-tauri/src/database.rs` wrapper over raw SQL

### File Organization

- **Services**: Single responsibility, avoid God objects. See `src/services/` for examples.
- **Components**: Organized by feature (`game/`, `settings/`, `ui/`, `layout/`)
- **Types**: Centralized in `src/types/index.ts` (Game, Store, AuthStatus, etc.)
- **Rust modules**: Mirror structure (`src-tauri/src/commands/`, `/services/`, `/store/`)

## Critical Knowledge

### Game Launch Flow

1. User clicks "Play" → `LibraryFullscreen.vue` calls `useLibraryStore().launchGame(gameId)`
2. Store invokes Rust command: `invoke("launch_game_v2", { gameId, window })`
3. Rust (`src-tauri/src/commands/launch.rs`) determines runner (Wine/Proton), executable path
4. Spawns game process, tracks PID, updates playtime in DB
5. Gamepad monitor (`src-tauri/src/gamepad.rs`) provides haptic feedback during gameplay

**Important:** Game configs stored in SQLite (`game_configs` table) to persist Wine/Proton settings.

### Authentication Flow

Each store (Epic/GOG/Amazon) has different auth mechanisms:

- **Epic (Legendary)**: OAuth browser flow → `legendary auth` CLI
- **GOG (Gogdl)**: Copy-paste code flow → `gogdl login`
- **Amazon (Nile)**: Email/password + 2FA → `nile auth`

Frontend (`src/services/auth/AuthService.ts`) coordinates with CLI sidecars. Tokens stored in CLI-specific locations (e.g., `~/.config/legendary/`), NOT in Pixxiden's DB.

### Metadata Enrichment

Games sync from stores **without metadata** (covers, descriptions). `EnrichmentService` fetches from:

- **IGDB API** (requires Twitch Client ID + Secret)
- **SteamGridDB API** (requires API key)

API keys managed via `src-tauri/src/commands/api_keys.rs`. First-run setup modal (`src/components/settings/SettingsApiKeys.vue`) collects keys.

**Cache:** Enriched data persists in SQLite `games` table (`metadata` JSON column).

### Sidecar Binary Management

External CLIs (legendary, gogdl, nile) are:

1. Downloaded by `scripts/postinstall.js` using `scripts/dependencies.yaml` mappings
2. Placed in `src-tauri/binaries/` (Git-ignored)
3. Bundled in AppImage via `tauri.conf.json` → `bundle.externalBin`
4. Executed via `SidecarService` which resolves binary paths at runtime

**Debugging tip:** If CLI fails, check `scripts/check-clis.sh` for manual verification.

### Session Mode & Fullscreen

Designed for **SteamOS-style session mode** (Wayland + Gamescope):

- `tauri.conf.json` sets `fullscreen: true`, `decorations: false`, `alwaysOnTop: true`
- Desktop file: `pixiden-session.desktop` for session selector integration
- **Input modes**: Gamepad-first UI for browsing and playing (see `useGamepad()` composable). However, **initial configuration** (API keys, store login) requires a keyboard and mouse.

## Common Pitfalls

1. **Don't call `invoke()` from services directly**—use typed wrappers in service classes
2. **E2E tests require built binary**—`npm run test:e2e` fails without prior `npm run tauri:build`
3. **Sidecar paths differ dev vs. production**—`SidecarService` handles resolution, don't hardcode paths
4. **SQLite schema migrations**: No formal migration system yet—handle schema updates manually in `DatabaseService.init()`
5. **IGDB/SteamGridDB rate limits**—`EnrichmentService` implements basic caching, but beware API quotas
6. **Gamepad support**: Xbox/PS/Switch controllers detected differently (see `useGamepad.ts` → `ControllerType`)

## Useful References

- **Tauri 2 docs**: https://v2.tauri.app/
- **Vue Router config**: `src/router/index.ts` (routes: `/`, `/game/:id`, `/settings/*`)
- **Store integrations**: `src/services/stores/` (Legendary/Gogdl/Nile/Steam examples)
- **Migration guide**: `MIGRATE.md` (documents Rust→TS refactoring decisions)
- **E2E guide**: `e2e/README.md` (setup, mock mode, page objects)

## When to Ask for Clarification

- Changing SQLite schema (no migration framework yet)
- Adding new Tauri commands (ensure proper registration in `lib.rs`)
- Modifying sidecar binary sources (update `dependencies.yaml` + test on Linux)
- Implementing new store integrations (follow `GameStoreService` pattern)
