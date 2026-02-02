# 📋 Plan de Refonte Rust ↔️ JS

## 🎯 Vision Globale

Passer d'une architecture **Rust-heavy** à une architecture **JS-first** où :

- **JS/TS** gère la logique métier (auth, enrichissement, orchestration)
- **Rust** reste limité aux opérations **système critique** et **I/O bas-niveau**
- **SQLite** (via Tauri plugin) persiste les données côté client
- **Sidecars** (legendary, gogdl, nile, steam) restent des outils externes

---

## 📦 PHASE 1 : SQLite + Wrapper Rust

### 1.1 - SQLite Local via Tauri JS Plugin

**Objectif:** Utiliser le plugin `@tauri-apps/plugin-sql` pour persister les données

```typescript
// src/db/schema.ts
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL,
  title TEXT NOT NULL,
  install_path TEXT,
  size_gb INTEGER,
  last_played TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  store TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  config_source TEXT
);

CREATE TABLE IF NOT EXISTS enrichment_cache (
  game_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  data JSON,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id, provider)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSON
);
`;

// src/db/Database.ts
import Database from "@tauri-apps/plugin-sql";

export class DatabaseService {
  private static instance: Database;

  static async init(): Promise<Database> {
    if (!this.instance) {
      this.instance = await Database.load("sqlite:pixxiden.db");
      await this.instance.execute(SCHEMA);
    }
    return this.instance;
  }

  static getInstance(): Database {
    if (!this.instance) throw new Error("Database not initialized");
    return this.instance;
  }
}
```

**Côté Rust:** Pas de wrapper DB

```
Le plugin @tauri-apps/plugin-sql gère tout depuis JS
Pas de commande Tauri pour exécuter des queries
(sauf cas exceptionnel découvert pendant le dev)
```

**Avantages:**

- Data persiste localement
- Pas de sync complexe Rust ↔ JS
- Requêtes SQL via services (jamais directement depuis Vue)
- Tests JS triviaux

---

### 1.2 - Layer d'Abstraction Services (Dépendances Unidirectionnels)

**Problème:** Éviter les dépendances circulaires en JS

**Architecture:**

```
src/services/
├── base/
│   ├── SidecarService.ts       (niveau bas)
│   └── DatabaseService.ts      (niveau bas)
├── stores/
│   ├── GameStoreService.ts     (utilise Sidecar + DB)
│   ├── EpicStoreService.ts     (utilise Sidecar + DB)
│   └── ... autres stores
├── auth/
│   ├── AuthFlowBase.ts         (classe abstraite)
│   ├── EpicAuthFlow.ts         (utilise Sidecar)
│   └── ... autres flows
├── enrichment/
│   ├── EnrichmentService.ts    (utilise DB + APIs)
│   └── ProvidersManager.ts
└── orchestration/
    └── GameLibraryOrchestrator.ts (orchestre tout)
```

**Règle d'Or:** Flux d'imports unidirectionnel

```
orchestration → stores → auth/enrichment → base
      ↓
    (jamais de retour vers le haut)
```

**Exemple - SidecarService (Niveau Bas)**

```typescript
// src/services/base/SidecarService.ts
import { invoke } from "@tauri-apps/api/core";

export interface SidecarResult {
  stdout: string;
  stderr: string;
  code: number;
}

export class SidecarService {
  private async run(command: string, args: string[]): Promise<SidecarResult> {
    try {
      const output = await invoke<string>("run_sidecar", {
        command,
        args,
      });
      return JSON.parse(output);
    } catch (error) {
      throw new Error(`Sidecar error: ${error}`);
    }
  }

  // Méthodes spécifiques pour chaque outil
  async runLegendary(args: string[]): Promise<SidecarResult> {
    return this.run("legendary", args);
  }

  async runGogdl(args: string[]): Promise<SidecarResult> {
    return this.run("gogdl", args);
  }

  async runNile(args: string[]): Promise<SidecarResult> {
    return this.run("nile", args);
  }

  async runSteam(args: string[]): Promise<SidecarResult> {
    return this.run("steam", args);
  }
}
```

**Exemple - GameStoreService (Niveau Métier)**

```typescript
// src/services/stores/GameStoreService.ts
import { SidecarService } from "../base/SidecarService";
import { DatabaseService } from "../base/DatabaseService";

export interface NormalizedGame {
  id: string;
  store: "epic" | "gog" | "amazon" | "steam";
  title: string;
  installPath?: string;
  sizeGb?: number;
}

export class GameStoreService {
  constructor(
    private sidecar: SidecarService,
    private db: DatabaseService,
  ) {}

  // Chaque service hérite de cette interface
  async listGames(): Promise<NormalizedGame[]> {
    throw new Error("Must be implemented by subclass");
  }

  protected async saveGames(games: NormalizedGame[]): Promise<void> {
    const sql = `INSERT INTO games (id, store, title, install_path, size_gb, metadata)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    for (const game of games) {
      await this.db.execute(sql, [
        game.id,
        game.store,
        game.title,
        game.installPath || null,
        game.sizeGb || null,
        JSON.stringify({}),
      ]);
    }
  }
}
```

**Exemple - LegendaryService (respecte l'interface Game)**

```typescript
// src/services/stores/LegendaryService.ts
import type { Game } from "@/types";

export class LegendaryService extends GameStoreService {
  async listGames(): Promise<Game[]> {
    const result = await this.sidecar.runLegendary(["list", "--json"]);

    if (result.code !== 0) {
      throw new Error(`Legendary failed: ${result.stderr}`);
    }

    const rawGames = JSON.parse(result.stdout);

    // Filtrer et mapper vers l'interface Game
    const games: Game[] = rawGames
      .filter((g: any) => g.is_installed)
      .map((g: any) => ({
        id: `epic-${g.app_name}`,
        storeId: g.app_name,
        store: "epic" as const,
        title: g.title,
        installed: true,
        installPath: g.install_path,
        installSize: g.install_size
          ? `${Math.round(g.install_size / 1024 / 1024 / 1024)}GB`
          : undefined,
        executablePath: g.executable,
        genres: [],
        playTimeMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    // Persister via service DB
    await this.db.saveGames(games);

    return games;
  }
}
```

**Exemple - Orchestrateur (Niveau Haut)**

```typescript
// src/services/orchestration/GameLibraryOrchestrator.ts
export class GameLibraryOrchestrator {
  constructor(
    private legendary: LegendaryService,
    private gogdl: GogdlService,
    private nile: NileService,
    private steam: SteamService,
    private enrichment: EnrichmentService,
    private db: DatabaseService,
  ) {}

  async syncAllGames(): Promise<NormalizedGame[]> {
    console.log("🎮 Starting full library sync...");

    const allGames: NormalizedGame[] = [];

    try {
      allGames.push(...(await this.legendary.listGames()));
    } catch (e) {
      console.warn("❌ Legendary sync failed:", e);
    }

    try {
      allGames.push(...(await this.gogdl.listGames()));
    } catch (e) {
      console.warn("❌ GOG sync failed:", e);
    }

    try {
      allGames.push(...(await this.nile.listGames()));
    } catch (e) {
      console.warn("❌ Amazon sync failed:", e);
    }

    try {
      allGames.push(...(await this.steam.listGames()));
    } catch (e) {
      console.warn("❌ Steam sync failed:", e);
    }

    // Enrichir les données
    const enriched = await this.enrichment.enrichGames(allGames);

    console.log(`✅ Synced ${enriched.length} games total`);
    return enriched;
  }
}
```

---

## 🔐 PHASE 2 : Authentification en JS

### 2.0 - Flow Général

```typescript
// src/services/auth/AuthFlowBase.ts
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export abstract class AuthFlowBase {
  constructor(
    protected sidecar: SidecarService,
    protected db: DatabaseService,
  ) {}

  abstract getAuthUrl(): Promise<string>;
  abstract handleCallback(payload: any): Promise<AuthToken>;

  async isAuthenticated(store: string): Promise<boolean> {
    const token = await this.db.queryOne("SELECT * FROM auth_tokens WHERE store = ?", [store]);

    if (!token) return false;
    if (!token.expires_at) return true;

    return new Date().getTime() < token.expires_at;
  }

  protected async saveToken(store: string, token: AuthToken): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO auth_tokens 
       (store, access_token, refresh_token, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [store, token.accessToken, token.refreshToken, token.expiresAt],
    );
  }

  async logout(store: string): Promise<void> {
    await this.db.execute("DELETE FROM auth_tokens WHERE store = ?", [store]);
  }
}
```

### 2.1 - Epic Games Flow

```typescript
// src/services/auth/EpicAuthFlow.ts
export class EpicAuthFlow extends AuthFlowBase {
  async getAuthUrl(): Promise<string> {
    const result = await this.sidecar.runLegendary(["auth-url"]);
    if (result.code !== 0) {
      throw new Error(`Failed to get Epic auth URL: ${result.stderr}`);
    }
    return result.stdout.trim();
  }

  async handleCallback(code: string): Promise<AuthToken> {
    // Sidecar legendary gère l'échange du code
    const result = await this.sidecar.runLegendary(["auth-exchange", code]);

    if (result.code !== 0) {
      throw new Error(`Epic auth failed: ${result.stderr}`);
    }

    const parsed = JSON.parse(result.stdout);
    const token: AuthToken = {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      expiresAt: Date.now() + parsed.expires_in * 1000,
    };

    await this.saveToken("epic", token);
    return token;
  }
}
```

### 2.2 - GOG Flow

```typescript
// src/services/auth/GogAuthFlow.ts
export class GogAuthFlow extends AuthFlowBase {
  async getAuthUrl(): Promise<string> {
    const result = await this.sidecar.runGogdl(["auth-url"]);
    if (result.code !== 0) {
      throw new Error(`Failed to get GOG auth URL`);
    }
    return result.stdout.trim();
  }

  async handleCallback(code: string): Promise<AuthToken> {
    const result = await this.sidecar.runGogdl(["auth-exchange", code]);

    if (result.code !== 0) {
      throw new Error(`GOG auth failed`);
    }

    const parsed = JSON.parse(result.stdout);
    const token: AuthToken = {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
    };

    await this.saveToken("gog", token);
    return token;
  }
}
```

### 2.3 - Amazon Flow (Credentials + 2FA)

```typescript
// src/services/auth/AmazonAuthFlow.ts
export class AmazonAuthFlow extends AuthFlowBase {
  async getAuthUrl(): Promise<string> {
    // Amazon est spécial : flow basé sur email/password
    return "inline"; // Pas de webview externe
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await this.sidecar.runNile(["login", email, password]);

    if (result.code === 0) {
      const token: AuthToken = { accessToken: "stored-by-nile" };
      await this.saveToken("amazon", token);
      return { success: true };
    }

    if (result.stderr.includes("2FA")) {
      return { success: false, requires2FA: true };
    }

    throw new Error(`Amazon login failed: ${result.stderr}`);
  }

  async loginWith2FA(email: string, password: string, code: string): Promise<void> {
    const result = await this.sidecar.runNile(["login", email, password, "--2fa-code", code]);

    if (result.code !== 0) {
      throw new Error(`2FA failed: ${result.stderr}`);
    }

    const token: AuthToken = { accessToken: "stored-by-nile" };
    await this.saveToken("amazon", token);
  }

  async handleCallback(): Promise<AuthToken> {
    throw new Error("Not used for Amazon");
  }
}
```

### 2.4 - Webview Auth (Tauri WebviewWindow)

Pour Epic/GOG, on crée une **webview Tauri** qui affiche l'URL d'authentification (via l'API Tauri `@tauri-apps/api/webviewWindow`)

```typescript
// src/services/auth/WebviewAuthHandler.ts
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";

export class WebviewAuthHandler {
  async openAuthWindow(store: "epic" | "gog", authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Créer une webview pour afficher l'URL de login
      const webview = new WebviewWindow(`auth-${store}`, {
        url: authUrl,
        width: 900,
        height: 700,
        center: true,
      });

      // Écouter le code retourné par la webview
      const unlisten = listen<string>(`auth-code-${store}`, (event) => {
        unlisten.then((fn) => fn());
        webview.close();
        resolve(event.payload);
      });

      // Timeout après 5 min
      const timeout = setTimeout(
        () => {
          unlisten.then((fn) => fn());
          webview.close();
          reject(new Error("Auth timeout"));
        },
        5 * 60 * 1000,
      );

      webview.closed.then(() => clearTimeout(timeout));
    });
  }
}
```

**Modal Vue (optionnel pour UX custom)**

```vue
<!-- src/components/auth/AuthModal.vue -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthService } from "@/services/auth/AuthService";

interface Props {
  store: "epic" | "gog" | "amazon" | "steam";
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: []; success: [] }>();

const { startAuth } = useAuthService();
const loading = ref(false);
const error = ref<string | null>(null);

const storeLabel = computed(
  () =>
    ({
      epic: "Epic Games",
      gog: "GOG",
      amazon: "Amazon Games",
      steam: "Steam",
    })[props.store],
);

async function handleAuthClick() {
  loading.value = true;
  error.value = null;
  try {
    // startAuth gère l'ouverture de la webview Tauri
    await startAuth(props.store);
    emit("success");
    emit("close");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Auth failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="props.open" class="auth-modal">
    <div class="backdrop" @click="emit('close')"></div>
    <div class="modal-content">
      <h2>Login to {{ storeLabel }}</h2>
      <p v-if="error" class="error">{{ error }}</p>

      <button :disabled="loading" @click="handleAuthClick">
        {{ loading ? "Opening browser..." : `Login to ${storeLabel}` }}
      </button>
    </div>
  </div>
</template>
```

---

## 🎮 PHASE 3 : Orchestration du Chargement des Jeux

### 3.1 - Pattern Wrapper pour Chaque Store

**Avant:**

```typescript
games.push(...await runLegendary('list_game', '').filter(...).map(...));
```

**Après:**

```typescript
games.push(...(await legendary.listGames()));
games.push(...(await gogdl.listGames()));
games.push(...(await nile.listGames()));
games.push(...(await steam.listGames()));
```

**Implémentation:**

```typescript
// src/services/stores/GogdlService.ts
export class GogdlService extends GameStoreService {
  async listGames(): Promise<NormalizedGame[]> {
    const result = await this.sidecar.runGogdl(["list", "--installed", "--json"]);

    if (result.code !== 0) {
      throw new Error(`GOG list failed: ${result.stderr}`);
    }

    const rawGames: any[] = JSON.parse(result.stdout);

    const games: NormalizedGame[] = rawGames.map((g) => ({
      id: `gog-${g.id}`,
      store: "gog",
      title: g.title,
      installPath: g.install_path,
      sizeGb: g.install_size ? Math.round(g.install_size / 1024 / 1024 / 1024) : 0,
    }));

    await this.saveGames(games);
    return games;
  }
}

// src/services/stores/NileService.ts
export class NileService extends GameStoreService {
  async listGames(): Promise<NormalizedGame[]> {
    const result = await this.sidecar.runNile(["list", "--json"]);

    if (result.code !== 0) {
      throw new Error(`Amazon list failed: ${result.stderr}`);
    }

    const rawGames: any[] = JSON.parse(result.stdout);

    const games: NormalizedGame[] = rawGames.map((g) => ({
      id: `amazon-${g.app_name}`,
      store: "amazon",
      title: g.title,
      installPath: g.install_path,
      sizeGb: g.install_size ? Math.round(g.install_size / 1024 / 1024 / 1024) : 0,
    }));

    await this.saveGames(games);
    return games;
  }
}

// src/services/stores/SteamService.ts
export class SteamService extends GameStoreService {
  async listGames(): Promise<NormalizedGame[]> {
    const result = await this.sidecar.runSteam(["list-installed", "--json"]);

    if (result.code !== 0) {
      throw new Error(`Steam list failed: ${result.stderr}`);
    }

    const rawGames: any[] = JSON.parse(result.stdout);

    const games: NormalizedGame[] = rawGames.map((g) => ({
      id: `steam-${g.appid}`,
      store: "steam",
      title: g.name,
      installPath: g.install_dir,
      sizeGb: g.size_on_disk ? Math.round(g.size_on_disk / 1024 / 1024 / 1024) : 0,
    }));

    await this.saveGames(games);
    return games;
  }
}
```

### 3.2 - Cache d'Enrichissement en SQLite

```typescript
// src/services/enrichment/EnrichmentService.ts
export interface EnrichedGame extends NormalizedGame {
  igdb?: any;
  steamGridDb?: any;
  htlb?: any;
  protonDb?: any;
}

export class EnrichmentService {
  constructor(
    private db: DatabaseService,
    private igdb: IgdbService,
    private steamGridDb: SteamGridDbService,
    private htlb: HowLongToBeatService,
    private protonDb: ProtonDbService,
  ) {}

  async enrichGames(games: NormalizedGame[]): Promise<EnrichedGame[]> {
    const enriched: EnrichedGame[] = [];

    for (const game of games) {
      enriched.push(await this.enrichGame(game));
    }

    return enriched;
  }

  private async enrichGame(game: NormalizedGame): Promise<EnrichedGame> {
    // Vérifier le cache
    const cached = await this.getFromCache(game.id);

    if (cached && this.isCacheValid(cached.fetched_at)) {
      return { ...game, ...cached.data };
    }

    // Enrichir depuis les APIs
    const enrichment = {
      igdb: await this.igdb.search(game.title).catch(() => null),
      steamGridDb: await this.steamGridDb.search(game.title).catch(() => null),
      htlb: await this.htlb.search(game.title).catch(() => null),
      protonDb:
        game.store === "steam" ? await this.protonDb.search(game.id).catch(() => null) : null,
    };

    // Sauvegarder en cache
    await this.saveToCache(game.id, enrichment);

    return { ...game, ...enrichment };
  }

  private async getFromCache(gameId: string): Promise<any | null> {
    const result = await this.db.queryOne(
      `SELECT data, fetched_at FROM enrichment_cache 
       WHERE game_id = ? ORDER BY fetched_at DESC LIMIT 1`,
      [gameId],
    );
    return result ? JSON.parse(result.data) : null;
  }

  private async saveToCache(gameId: string, data: any): Promise<void> {
    await this.db.execute(
      `INSERT INTO enrichment_cache (game_id, provider, data, fetched_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [gameId, "all", JSON.stringify(data)],
    );
  }

  private isCacheValid(fetchedAt: number): boolean {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(fetchedAt).getTime() < oneWeekMs;
  }
}
```

---

## ⚙️ PHASE 4 : Nettoyage Rust

### 4.0 - Règle Générale

**Rust ne doit gérer QUE:**

1. Lancer les jeux (process management)
2. Événements système (gamepad via `tauri_plugin_gamepad`)
3. I/O file système critique (lire configs complexes)

### 4.1 - Suppression de auth.rs

**RAISON:** Toute la logique auth est côté JS (sidecars + DB locale)

```bash
# Supprimer le fichier
rm src-tauri/src/commands/auth.rs
```

**Mise à jour lib.rs:**

```rust
// Avant
use commands::{
    auth::{epic_start_auth, gog_login_with_code, ...},
    ...
};

// Après (plus rien auth)
use commands::{
    launch_game,
    get_system_info,
    ...
};
```

### 4.2 - Suppression de get_games côté Rust

**RAISON:** Les jeux sont dans SQLite local, accessible depuis JS via **services**

**Avant:**

```rust
#[tauri::command]
pub async fn get_games(state: State<'_, AppState>) -> Result<Vec<Game>, String> {
    // Lire DB Rust → convertir JSON → envoyer à JS
}
```

**Après (supprimé):** Accès via service GameLibraryService

```typescript
// src/services/GameLibraryService.ts
import { DatabaseService } from "./base/DatabaseService";
import type { Game } from "@/types";

export class GameLibraryService {
  constructor(private db: DatabaseService) {}

  async getAllGames(): Promise<Game[]> {
    return this.db.select<Game>("SELECT * FROM games");
  }

  async getGameById(id: string): Promise<Game | null> {
    return this.db.queryOne<Game>("SELECT * FROM games WHERE id = ?", [id]);
  }
}

// Dans les composables : jamais de requête SQL directe
// src/composables/useLibrary.ts
import { useGameLibraryService } from "@/services";

export function useLibrary() {
  const libraryService = useGameLibraryService();

  async function fetchGames() {
    return libraryService.getAllGames();
  }

  return { fetchGames };
}
```

}

return { fetchGames };
}

````

### 4.3 - Garder launch_game en Rust

**RAISON:** I/O système, gestion de processus, événements de retour

**Contrat d'interface :** JS envoie TOUTES les données du jeu à Rust

```typescript
// src/services/GameLauncherService.ts
import { invoke } from '@tauri-apps/api/core';
import type { Game } from '@/types';

export class GameLauncherService {
  async launchGame(game: Game): Promise<void> {
    // Envoyer TOUTES les infos nécessaires à Rust
    await invoke('launch_game', {
      gameId: game.id,
      title: game.title,
      installPath: game.installPath,
      executablePath: game.executablePath,
      customExecutable: game.customExecutable,
      winePrefix: game.winePrefix,
      wineVersion: game.wineVersion,
      runner: game.runner,
    });
  }

  async isGameRunning(gameId: string): Promise<boolean> {
    return invoke('is_game_running', { gameId });
  }

  async terminateGame(gameId: string): Promise<void> {
    return invoke('terminate_game', { gameId });
  }
}
````

```rust
// src-tauri/src/commands.rs
#[derive(serde::Deserialize)]
pub struct LaunchGameRequest {
    game_id: String,
    title: String,
    install_path: String,
    executable_path: Option<String>,
    custom_executable: Option<String>,
    wine_prefix: Option<String>,
    wine_version: Option<String>,
    runner: Option<String>,
}

#[tauri::command]
pub async fn launch_game(
    app: tauri::AppHandle,
    request: LaunchGameRequest,
) -> Result<(), String> {
    // 1. Utiliser les données reçues (pas de lecture DB)
    // 2. Exécuter le jeu (proc management)
    // 3. Émettre des événements de monitoring

    let mut cmd = std::process::Command::new(&request.executable_path.unwrap_or_else(|| request.title.clone()));
    cmd.current_dir(&request.install_path);

    let child = cmd.spawn().map_err(|e| e.to_string())?;

    // Émettre un événement
    let _ = app.emit("game-launched", &request.game_id);

    Ok(())
}

#[tauri::command]
pub async fn is_game_running(game_id: String) -> Result<bool, String> {
    // Vérifier si process tourne
    Ok(false) // À implémenter
}

#[tauri::command]
pub async fn terminate_game(game_id: String) -> Result<(), String> {
    // Killer le processus
    Ok(())
}
```

---

## 💾 PHASE 5 : I/O Système Critique (Rust)

### 5.0 - Qu'est-ce qui reste en Rust ?

```
src-tauri/src/
├── main.rs                  (setup minimal)
├── lib.rs                   (manager state basique)
├── commands.rs              (~100 lignes)
│   ├── launch_game(game_data) ← reçoit toutes les données de JS
│   ├── terminate_game(game_id)
│   └── is_game_running(game_id)
├── gamepad.rs               (émettre events guide/start seulement)
├── system.rs                (get_system_info)
└── services/
    └── process_manager.rs   (spawn/kill processes)
```

### 5.1 - database.rs : À SUPPRIMER

**RAISON:** SQLite plugin Tauri gère tout depuis JS, pas besoin d'un wrapper Rust

```bash
# Avant
src-tauri/src/database.rs  ← SUPPRIMER
src-tauri/src/commands/auth.rs  ← SUPPRIMÉ (voir 4.1)

# Après
tout passe par @tauri-apps/plugin-sql depuis JS
```

### 5.2 - File I/O Critique

**Cas d'usage rarissime :** Lire/écrire des fichiers volumineux de config

```rust
// src-tauri/src/services/file_io.rs
#[tauri::command]
pub async fn read_game_config(game_path: String) -> Result<String, String> {
    // Utiliser seulement si > 10MB ou parsing complexe

    let config_path = PathBuf::from(&game_path)
        .join("config.yaml");

    std::fs::read_to_string(&config_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_game_config(game_path: String, config: String) -> Result<(), String> {
    let config_path = PathBuf::from(&game_path)
        .join("config.yaml");

    std::fs::write(&config_path, config)
        .map_err(|e| e.to_string())
}
```

### 5.3 - Événements Système (Gamepad)

**UI côté JS (VueUse) - pour interaction menus/UI:**

```typescript
// src/composables/useGamepadUI.ts
import { useGamepad } from "@vueuse/core";
import { watchEffect } from "vue";

export function useGamepadUI() {
  const gamepad = useGamepad({ index: 0 });

  // Écouter les boutons pour contrôler l'UI (menus, navigation)
  watchEffect(() => {
    if (gamepad.value?.buttons[0].pressed) {
      // Confirmer action UI
    }
    if (gamepad.value?.buttons[1].pressed) {
      // Retour
    }
  });

  return { gamepad };
}
```

**Événements système en Rust (pour boutons spéciaux overlay, guide):**

```rust
// src-tauri/src/gamepad.rs
#[tauri::command]
pub async fn start_gamepad_monitoring(
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Émettre des events vers JS quand certains boutons pressés
    // (ex: bouton GUIDE pour overlay, screenshot, etc.)
    // Les boutons standard (A, B, X, Y, sticks) sont gérés par VueUse en JS

    std::thread::spawn(move || {
        loop {
            if let Some(gamepad) = gilrs.gamepad(0) {
                for (button, pressed) in gamepad.buttons() {
                    // Boutons spéciaux système
                    if pressed && button == Button::Guide {
                        let _ = app.emit("gamepad-guide", ());
                    }
                    if pressed && button == Button::Start {
                        let _ = app.emit("gamepad-start", ());
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    });

    Ok(())
}
```

---

## 🔄 Architecture Finale

```
┌──────────────────────────────────────────┐
│  Vue 3 + Pinia + TypeScript              │
│  ├─ Components (Auth modals, UI)        │
│  ├─ Composables (useGames, useAuth)     │
│  └─ Stores (libraryStore, authStore)    │
└─────────────┬──────────────────────────┬──┘
              │                          │
      ┌───────▼──────────┐      ┌────────▼────────┐
      │  Services (JS)   │      │ SQLite Local    │
      ├─ auth/*         │      │ (@tauri/sql)    │
      ├─ stores/*       │      └─────────────────┘
      ├─ enrichment/*   │
      ├─ base/          │
      └─────┬───────────┘
            │ invoke('run_sidecar', ...)
      ┌─────▼──────────────────────────┐
      │  Rust (Minimal)                │
      ├─ launch_game()                │
      ├─ gamepad monitoring           │
      ├─ process management           │
      └─────┬──────────────────────────┘
            │ std::process::Command
      ┌─────▼──────────────────┐
      │  Sidecars              │
      ├─ legendary            │
      ├─ gogdl               │
      ├─ nile                │
      └─ steam               │
      └───────────────────────┘
```

---

## ✅ Critères de Réussite (Checklist)

- [ ] **SQLite.js intégré** : Schéma créé, tables accessibles depuis composables
- [ ] **Services abstraits** : Zéro dépendances circulaires, hiérarchie claire
- [ ] **Auth en JS 100%** : Plus de `auth.rs`, plus de `epic_start_auth` en Rust
- [ ] **Wrappers store** : `legendary.listGames()`, `gog.listGames()`, etc.
- [ ] **Enrichissement en cache** : Métadatas persistes dans `enrichment_cache`
- [ ] **Rust minimaliste** : < 200 lignes en commands.rs
- [ ] **Tests JS** : Auth flows testables en Vitest
- [ ] **Pas de database.rs** : Supprimé
- [ ] **Pas de get_games Rust** : Accès direct à SQLite depuis JS

---

## 🚀 Ordre Implémentation

1. [x] **Setup SQLite.js** (`src/services/base/schema.ts`, `DatabaseService.ts`)
2. [x] **SidecarService** (`src/services/base/SidecarService.ts` - wrapper bas niveau)
3. [x] **GameStoreService** (abstraite) + implementations (`LegendaryService`, `GogdlService`, `NileService`, `SteamService`)
4. [x] **AuthService** + `WebviewAuthHandler` (webview OAuth via Tauri API)
5. [x] **EnrichmentService** (enrichissement + cache 7 jours)
6. [x] **GameLibraryOrchestrator** (orchestre stores + enrichment)
7. [x] **Services Index** (`src/services/index.ts` - exports + factory)
8. [x] **Adapter Pinia Stores** (`library.ts` et `auth.ts` utilisent les nouveaux services)
9. [x] **launch_game_v2** (nouvelle commande Rust qui reçoit toutes les données)
10. [ ] **Cleanup Rust** (supprimer auth.rs, database.rs, get_games - APRÈS validation)
11. [ ] **Tests** (Vitest pour services JS)

---

## 📝 Notes Additionnelles

- **Dépendances unidirectionnels :** Toujours importer vers le haut, jamais vers le bas
- **Imports:** Toujours imports statiques en haut de fichier, jamais `await import()` dynamique
- **Requêtes SQL:** Exclusivement via services, jamais directement depuis Vue/Composables
- **Sidecar errors :** Gérer gracefully en JS, fallback sur chaque service
- **Cache invalidation :** 7 jours par défaut pour enrichissement, configurable
- **Token storage :** SQLite local, jamais en localStorage insécurisé
- **Contrat launch_game :** JS envoie TOUTES les données du jeu, Rust les utilise (pas de lecture DB en Rust)
- **Process management :** Rester en Rust (trop système-dépendant)
- **Gamepad UI :** VueUse pour l'interaction de contrôleur dans les menus
- **Gamepad événements :** Rust pour les boutons spéciaux seulement (guide, start)
- **Webview Auth :** Utiliser API Tauri WebviewWindow pour afficher URLs de login
