/**
 * GameLibraryOrchestrator - Main facade for game library operations
 *
 * Delegates to:
 * - GameRepository (all database reads/writes — pure TypeScript)
 * - GameSyncService (sync + enrichment pipeline)
 * - Store services (authentication status checks)
 *
 * This orchestrator contains NO Rust invoke calls.
 * All data flows through SQLite via @tauri-apps/plugin-sql.
 */

import type { Game, StoreType } from "@/types";
import { GameRepository } from "@/lib/database";
import { GameSyncService, type SyncOptions, type SyncResult } from "@/lib/sync";
import { DatabaseService, SidecarService } from "./base";
import { LegendaryService, GogdlService, NileService } from "./stores";
import type { StoreCapabilities } from "./stores";
import { ProtonService, type ProtonConfig } from "./runners";
import { UmuLauncherService } from "./runners/UmuLauncherService";
import { warn, info } from "@tauri-apps/plugin-log";
import { mkdir } from "@tauri-apps/plugin-fs";

export type { SyncResult, SyncOptions };

export interface StoreStatus {
  store: StoreType;
  authenticated: boolean;
  gamesCount: number;
  lastSync: Date | null;
  capabilities: StoreCapabilities;
}

export class GameLibraryOrchestrator {
  private static instance: GameLibraryOrchestrator | null = null;

  private gameRepo: GameRepository;
  private syncService: GameSyncService;
  private legendary: LegendaryService;
  private gogdl: GogdlService;
  private nile: NileService;
  private umuLauncher: UmuLauncherService;

  private constructor() {
    const db = DatabaseService.getInstance();
    const sidecar = SidecarService.getInstance();

    this.gameRepo = GameRepository.getInstance();
    this.syncService = GameSyncService.getInstance();
    this.legendary = new LegendaryService(sidecar, db);
    this.gogdl = new GogdlService(sidecar, db);
    this.nile = new NileService(sidecar, db);
    this.umuLauncher = UmuLauncherService.getInstance();
  }

  static getInstance(): GameLibraryOrchestrator {
    if (!GameLibraryOrchestrator.instance) {
      GameLibraryOrchestrator.instance = new GameLibraryOrchestrator();
    }
    return GameLibraryOrchestrator.instance;
  }

  /**
   * Initialize the orchestrator and database
   */
  async initialize(): Promise<void> {
    await DatabaseService.getInstance().init();
  }

  // ===== Game Queries (pure SQLite reads) =====

  /**
   * Get all games from SQLite — no Rust invoke needed
   */
  async getAllGames(): Promise<Game[]> {
    return this.gameRepo.getAllGames();
  }

  /**
   * Get a single game by ID
   */
  async getGameById(gameId: string): Promise<Game | null> {
    return this.gameRepo.getGameById(gameId);
  }

  /**
   * Get games by store
   */
  async getGamesByStore(store: StoreType): Promise<Game[]> {
    return this.gameRepo.getGamesByStore(store);
  }

  /**
   * Search games by title or developer (SQL LIKE query)
   */
  async searchGames(query: string): Promise<Game[]> {
    return this.gameRepo.searchGames(query);
  }

  /**
   * Get recently played games
   */
  async getRecentlyPlayed(limit: number = 10): Promise<Game[]> {
    return this.gameRepo.getRecentlyPlayed(limit);
  }

  /**
   * Get favorite games
   */
  async getFavorites(): Promise<Game[]> {
    return this.gameRepo.getFavorites();
  }

  // ===== Sync (delegates to GameSyncService) =====

  /**
   * Sync library with all authenticated stores
   * Fetches games, enriches metadata, persists to SQLite
   */
  async syncLibrary(options?: SyncOptions): Promise<SyncResult> {
    return this.syncService.sync(options);
  }

  /**
   * Force re-sync: clears enrichment cache and re-enriches all games
   */
  async resyncLibrary(): Promise<SyncResult> {
    return this.syncService.sync({ forceEnrich: true });
  }

  // ===== Store Status =====

  /**
   * Get authentication and games status for all stores
   */
  async getStoresStatus(): Promise<StoreStatus[]> {
    const [epicAuth, gogAuth, amazonAuth] = await Promise.all([
      this.legendary.isAuthenticated(),
      this.gogdl.isAuthenticated(),
      this.nile.isAuthenticated(),
    ]);

    const [epicCount, gogCount, amazonCount, steamCount] = await Promise.all([
      this.gameRepo.getGamesByStore("epic").then((g) => g.length),
      this.gameRepo.getGamesByStore("gog").then((g) => g.length),
      this.gameRepo.getGamesByStore("amazon").then((g) => g.length),
      this.gameRepo.getGamesByStore("steam").then((g) => g.length),
    ]);

    return [
      {
        store: "epic",
        authenticated: epicAuth,
        gamesCount: epicCount,
        lastSync: null,
        capabilities: this.legendary.getCapabilities(),
      },
      {
        store: "gog",
        authenticated: gogAuth,
        gamesCount: gogCount,
        lastSync: null,
        capabilities: this.gogdl.getCapabilities(),
      },
      {
        store: "amazon",
        authenticated: amazonAuth,
        gamesCount: amazonCount,
        lastSync: null,
        capabilities: this.nile.getCapabilities(),
      },
      {
        store: "steam",
        authenticated: true,
        gamesCount: steamCount,
        lastSync: null,
        capabilities: {
          canListGames: false,
          canInstall: true,
          canLaunch: true,
          canGetInfo: false,
          canSyncSaves: false,
        },
      },
    ];
  }

  // ===== Game Launch =====

  /**
   * Prepare game launch data (command + env vars)
   */
  async prepareGameLaunch(gameId: string): Promise<{
    game: Game;
    launchCommand: string[];
    env: Record<string, string>;
  }> {
    const game = await this.gameRepo.getGameById(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // Wait for Proton installation to finish before building launch command.
    // Fixes race condition: if Proton is still downloading, getProtonPath() returns null
    // → no --wine flag → legendary defaults to 'wine' → FileNotFoundError
    const protonService = ProtonService.getInstance();
    const protonConfig = await protonService.ensureProtonInstalled();

    // Check 32-bit prerequisites for Proton-based launches (Epic, GOG)
    if (protonConfig && (game.storeData.store === "epic" || game.storeData.store === "gog")) {
      const prereqs = await protonService.checkSystemPrerequisites();
      if (!prereqs.ok) {
        throw new Error(prereqs.instructions);
      }
    }

    // Build launch command (store-specific CLI + args)
    let launchCommand = await this.buildLaunchCommand(game, protonConfig);

    // Build environment variables (Proton env + STEAM_COMPAT_DATA_PATH)
    let env = await this.buildLaunchEnv(game, protonConfig);

    // If umu-run is available, the game has an executablePath (.exe), and we're using Proton,
    // bypass the CLI command entirely and launch the .exe directly via umu-run-wrapper.
    // This provides Steam Runtime + Steam Input for proper controller support.
    const protonPath = this.resolveProtonPath(game, protonConfig);
    const executablePath = game.installation.executablePath;

    if (protonPath && executablePath && (await this.umuLauncher.isAvailable())) {
      const winePrefix = game.installation.winePrefix || env.STEAM_COMPAT_DATA_PATH || "";
      
      const [umuCommand, umuEnv] = this.umuLauncher.buildDirectLaunch({
        winePrefix,
        protonPath,
        store: game.storeData.store,
        storeId: game.storeData.storeId,
        executablePath,
      });

      launchCommand = umuCommand;
      // Merge UMU env vars with existing env (UMU vars take precedence)
      env = { ...env, ...umuEnv };

      await info(
        `[Orchestrator] Using umu-run for ${game.info.title}: exe=${executablePath} (GAMEID=${umuEnv.GAMEID})`,
      );
    }

    return {
      game,
      launchCommand,
      env,
    };
  }

  private async buildLaunchCommand(
    game: Game,
    protonConfig: ProtonConfig | null,
  ): Promise<string[]> {
    // Resolve effective proton path: prefer Heroic-configured runner (if Proton type),
    // otherwise fall back to Pixxiden's own Proton-GE
    const protonPath = this.resolveProtonPath(game, protonConfig);

    // PyInstaller-bundled sidecars (legendary, gogdl, nile) pollute PYTHONHOME/PYTHONPATH/
    // LD_LIBRARY_PATH. When they spawn Proton (also Python), it crashes.
    // Fix: /usr/bin/env -u unsets those vars before Proton runs.
    const cleanEnv = "/usr/bin/env -u PYTHONHOME -u PYTHONPATH -u PYTHONDONTWRITEBYTECODE -u _MEIPASS2 -u LD_LIBRARY_PATH";

    switch (game.storeData.store) {
      case "epic": {
        const args = ["legendary", "launch", game.storeData.storeId];
        if (protonPath) {
          // Proton is NOT a drop-in Wine replacement — it requires a verb
          // (e.g. waitforexitandrun) as first argument. Using --wine would call
          // `proton game.exe` which errors with "Proton: Need a verb."
          // Instead: --no-wine disables legendary's wine handling, and --wrapper
          // passes the full `proton waitforexitandrun` as a command prefix.
          // Wine prefix is handled via STEAM_COMPAT_DATA_PATH env var (see buildLaunchEnv).
          args.push("--no-wine", "--wrapper", `${cleanEnv} ${protonPath} waitforexitandrun`);
        }
        return args;
      }
      case "gog": {
        // gogdl requires --auth-config-path before the subcommand
        const configPath = await this.gogdl.getAuthConfigPathPublic();
        const args = ["gogdl", "--auth-config-path", configPath, "launch"];
        if (protonPath) {
          args.push("--platform", "windows");
          // Same Proton wrapper approach as epic — see comment above
          args.push("--no-wine", "--wrapper", `${cleanEnv} ${protonPath} waitforexitandrun`);
        }
        if (game.installation.installPath) {
          args.push(game.installation.installPath);
        }
        args.push(game.storeData.storeId);
        return args;
      }
      case "amazon":
        return ["nile", "launch", game.storeData.storeId];
      case "steam":
        return ["steam", "-applaunch", game.storeData.storeId];
      default:
        throw new Error(`Unknown store: ${game.storeData.store}`);
    }
  }

  /**
   * Resolve the effective Proton binary path for a game.
   *
   * Priority:
   * 1. Heroic-configured Proton path (from GamesConfig/{storeId}.json → wineVersion.bin)
   *    — only if runner type is "proton"
   * 2. Pixxiden's own Proton-GE install path
   * 3. null (no Proton available)
   */
  private resolveProtonPath(game: Game, protonConfig: ProtonConfig | null): string | null {
    // If game has a Heroic-configured Proton runner with a binary path, prefer it
    if (
      game.installation.runner === "proton" &&
      game.installation.runnerPath
    ) {
      return game.installation.runnerPath;
    }

    return protonConfig?.protonPath ?? null;
  }

  private async buildLaunchEnv(
    game: Game,
    protonConfig: ProtonConfig | null,
  ): Promise<Record<string, string>> {
    const env: Record<string, string> = {};

    // Determine if this game needs Proton env vars:
    // - Game is from Epic or GOG (non-Steam, non-Amazon)
    // - AND either Pixxiden has Proton-GE installed OR the game has a Heroic Proton config
    const needsProton =
      (game.storeData.store === "epic" || game.storeData.store === "gog") &&
      (protonConfig || (game.installation.runner === "proton" && game.installation.runnerPath));

    if (needsProton) {
      const protonService = ProtonService.getInstance();

      try {
        // If the game has a Heroic-configured wine prefix, use it directly.
        // Heroic (via umu-launcher) sets STEAM_COMPAT_DATA_PATH = WINEPREFIX
        // and leaves STEAM_COMPAT_CLIENT_INSTALL_PATH empty — this is correct
        // for Proton launched through umu-launcher or directly.
        if (game.installation.winePrefix) {
          env.STEAM_COMPAT_DATA_PATH = game.installation.winePrefix;

          // proton-cachyos (and some other Proton forks) crash if
          // STEAM_COMPAT_CLIENT_INSTALL_PATH is missing — they use
          // os.environ["..."] instead of .get(). Set it to an empty
          // compat dir just like we do for non-Heroic games.
          const runnersDir = await protonService.getRunnersDir();
          const compatDir = `${runnersDir}/compat`;
          await mkdir(compatDir, { recursive: true });
          env.STEAM_COMPAT_CLIENT_INSTALL_PATH = compatDir;

          await info(
            `[Orchestrator] Using Heroic prefix: STEAM_COMPAT_DATA_PATH=${game.installation.winePrefix}`,
          );
        } else {
          // No Heroic prefix — create our own per-game prefix directory
          const prefixesDir = await protonService.getPrefixesDir();
          const compatDataPath = `${prefixesDir}/${game.storeData.store}/${game.storeData.storeId}`;

          // Ensure the per-game prefix directory exists before Proton tries to lock it
          await mkdir(compatDataPath, { recursive: true });

          // STEAM_COMPAT_DATA_PATH: where Proton stores the Wine prefix (pfx/ subdir)
          env.STEAM_COMPAT_DATA_PATH = compatDataPath;

          // STEAM_COMPAT_CLIENT_INSTALL_PATH: Proton expects a Steam install dir
          // for copying runtime DLLs (steamclient.dll etc). When running outside Steam,
          // we point to an empty compat dir — Proton handles missing files gracefully.
          // Note: umu-launcher sets this to empty, so we only set it for non-Heroic games.
          const runnersDir = await protonService.getRunnersDir();
          const compatDir = `${runnersDir}/compat`;
          await mkdir(compatDir, { recursive: true });
          env.STEAM_COMPAT_CLIENT_INSTALL_PATH = compatDir;

          await info(
            `[Orchestrator] Set Proton env: STEAM_COMPAT_DATA_PATH=${compatDataPath}, STEAM_COMPAT_CLIENT_INSTALL_PATH=${compatDir}`,
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await warn(`[Orchestrator] Could not set Proton env vars: ${msg}`);
      }
    }

    return env;
  }

  // ===== Cloud Save Sync =====

  /**
   * Sync cloud saves for a game (currently only GOG via gogdl save-sync)
   */
  async syncSaves(gameId: string): Promise<void> {
    const game = await this.gameRepo.getGameById(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    if (game.storeData.store === "gog" && game.installation.installed) {
      await this.gogdl.syncSaves(game.storeData.storeId, game.installation.installPath);
    }
  }

  // ===== Game Metadata Updates =====

  /**
   * Update game metadata (favorites, playtime, last played)
   */
  async updateGameMetadata(
    gameId: string,
    updates: {
      isFavorite?: boolean;
      playTimeMinutes?: number;
      lastPlayed?: string;
    },
  ): Promise<void> {
    await this.gameRepo.updateMetadata(gameId, updates);
  }

  /**
   * Update the executable path for a game (used for umu-run direct launch)
   * This is the Windows .exe path that umu-run will execute.
   */
  async updateExecutablePath(gameId: string, executablePath: string): Promise<void> {
    await this.gameRepo.updateEnrichment(gameId, { executable_path: executablePath });
    await info(`[Orchestrator] Updated executable_path for ${gameId}: ${executablePath}`);
  }

  /**
   * Remove a game from library (does not uninstall)
   */
  async removeGameFromLibrary(gameId: string): Promise<void> {
    await this.gameRepo.deleteGame(gameId);
  }
}
