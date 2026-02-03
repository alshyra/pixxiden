/**
 * GameLibraryOrchestrator - Orchestrateur principal de la bibliothèque
 *
 * Responsabilités:
 * - Agrège les jeux de tous les stores
 * - Applique l'enrichissement
 * - Gère le refresh/sync de la bibliothèque
 * - Interface principale pour les stores Pinia
 *
 * Dépendances unidirectionnelles:
 * - stores/* (Legendary, Gogdl, Nile, Steam)
 * - enrichment/EnrichmentService
 * - base/DatabaseService
 */

import type { Game, StoreType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { DatabaseService, SidecarService } from "./base";
import { LegendaryService, GogdlService, NileService, SteamService } from "./stores";
import { EnrichmentService } from "./enrichment";

export interface LibrarySyncResult {
  total: number;
  added: number;
  updated: number;
  removed: number;
  errors: { store: StoreType; error: string }[];
}

export interface StoreStatus {
  store: StoreType;
  authenticated: boolean;
  gamesCount: number;
  lastSync: Date | null;
}

export class GameLibraryOrchestrator {
  private static instance: GameLibraryOrchestrator | null = null;

  private legendary: LegendaryService;
  private gogdl: GogdlService;
  private nile: NileService;
  private steam: SteamService;
  private enrichment: EnrichmentService;
  private db: DatabaseService;
  private sidecar: SidecarService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.sidecar = SidecarService.getInstance();
    // Créer les instances des services avec Sidecar + DB
    this.legendary = new LegendaryService(this.sidecar, this.db);
    this.gogdl = new GogdlService(this.sidecar, this.db);
    this.nile = new NileService(this.sidecar, this.db);
    this.steam = new SteamService(this.sidecar, this.db);
    this.enrichment = new EnrichmentService(this.db);
  }

  static getInstance(): GameLibraryOrchestrator {
    if (!GameLibraryOrchestrator.instance) {
      GameLibraryOrchestrator.instance = new GameLibraryOrchestrator();
    }
    return GameLibraryOrchestrator.instance;
  }

  /**
   * Initialise l'orchestrateur et la base de données
   */
  async initialize(): Promise<void> {
    await this.db.init();
  }

  /**
   * Récupère tous les jeux de la bibliothèque
   * Appelle directement le backend Tauri pour récupérer les jeux enrichis
   */
  async getAllGames(): Promise<Game[]> {
    try {
      // Appel direct au backend Tauri qui retourne les jeux enrichis
      const games = await invoke<Game[]>("get_games");
      return games || [];
    } catch (error) {
      console.error("❌ Failed to get games from backend:", error);
      return [];
    }
  }

  /**
   * Synchronise la bibliothèque avec tous les stores authentifiés
   * Fetch depuis les CLIs + enrichissement + sauvegarde DB
   */
  async syncLibrary(options?: {
    stores?: StoreType[];
    forceEnrich?: boolean;
  }): Promise<LibrarySyncResult> {
    const result: LibrarySyncResult = {
      total: 0,
      added: 0,
      updated: 0,
      removed: 0,
      errors: [],
    };

    const storesToSync: StoreType[] = options?.stores ?? ["epic", "gog", "amazon", "steam"];

    // Récupérer les jeux existants pour comparer
    const existingGames = await this.getAllGames();
    const existingIds = new Set(existingGames.map((g) => g.id));

    const newGames: Game[] = [];

    // Sync chaque store en parallèle
    const syncPromises = storesToSync.map(async (store) => {
      try {
        const games = await this.syncStore(store);
        return { store, games, error: null };
      } catch (error) {
        return {
          store,
          games: [] as Game[],
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.all(syncPromises);

    for (const { store, games, error } of results) {
      if (error) {
        result.errors.push({ store, error });
      } else {
        for (const game of games) {
          if (existingIds.has(game.id)) {
            result.updated++;
          } else {
            result.added++;
          }
          newGames.push(game);
        }
      }
    }

    // Enrichir les nouveaux jeux ou ceux forcés
    if (newGames.length > 0) {
      await this.enrichment.enrichGames(newGames);
    }

    result.total = newGames.length;
    return result;
  }

  /**
   * Sync un store spécifique
   */
  private async syncStore(store: StoreType): Promise<Game[]> {
    switch (store) {
      case "epic": {
        const isAuth = await this.legendary.isAuthenticated();
        if (!isAuth) return [];
        const games = await this.legendary.listGames();
        await this.legendary.persistGames(games);
        return games;
      }
      case "gog": {
        const isAuth = await this.gogdl.isAuthenticated();
        if (!isAuth) return [];
        const games = await this.gogdl.listGames();
        await this.gogdl.persistGames(games);
        return games;
      }
      case "amazon": {
        const isAuth = await this.nile.isAuthenticated();
        if (!isAuth) return [];
        const games = await this.nile.listGames();
        await this.nile.persistGames(games);
        return games;
      }
      case "steam": {
        const games = await this.steam.listGames();
        await this.steam.persistGames(games);
        return games;
      }
      default:
        return [];
    }
  }

  /**
   * Récupère le statut de tous les stores
   */
  async getStoresStatus(): Promise<StoreStatus[]> {
    const statuses: StoreStatus[] = [];

    const [epicAuth, gogAuth, amazonAuth] = await Promise.all([
      this.legendary.isAuthenticated(),
      this.gogdl.isAuthenticated(),
      this.nile.isAuthenticated(),
    ]);

    const [epicGames, gogGames, amazonGames, steamGames] = await Promise.all([
      this.legendary.getStoredGames(),
      this.gogdl.getStoredGames(),
      this.nile.getStoredGames(),
      this.steam.getStoredGames(),
    ]);

    // Pour lastSync, on pourrait stocker ça dans settings
    // Pour l'instant on met null
    statuses.push(
      {
        store: "epic",
        authenticated: epicAuth,
        gamesCount: epicGames.length,
        lastSync: null,
      },
      {
        store: "gog",
        authenticated: gogAuth,
        gamesCount: gogGames.length,
        lastSync: null,
      },
      {
        store: "amazon",
        authenticated: amazonAuth,
        gamesCount: amazonGames.length,
        lastSync: null,
      },
      {
        store: "steam",
        authenticated: true, // Steam n'a pas d'auth via CLI
        gamesCount: steamGames.length,
        lastSync: null,
      },
    );

    return statuses;
  }

  /**
   * Lance un jeu - prépare toutes les données pour le launch Rust
   */
  async prepareGameLaunch(gameId: string): Promise<{
    game: Game;
    launchCommand: string[];
    env: Record<string, string>;
  }> {
    // Récupérer le jeu depuis la DB
    const allGames = await this.getAllGames();
    const game = allGames.find((g) => g.id === gameId);

    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // Construire la commande de lancement selon le store
    const launchCommand = this.buildLaunchCommand(game);
    const env = this.buildLaunchEnv(game);

    return { game, launchCommand, env };
  }

  /**
   * Construit la commande de lancement pour un jeu
   */
  private buildLaunchCommand(game: Game): string[] {
    switch (game.store) {
      case "epic":
        return ["legendary", "launch", game.storeId];
      case "gog":
        return ["gogdl", "launch", game.storeId];
      case "amazon":
        return ["nile", "launch", game.storeId];
      case "steam":
        return ["steam", "-applaunch", game.storeId];
      default:
        throw new Error(`Unknown store: ${game.store}`);
    }
  }

  /**
   * Construit les variables d'environnement pour le lancement
   */
  private buildLaunchEnv(_game: Game): Record<string, string> {
    // Variables d'environnement communes pour les jeux
    // Pourrait être étendu avec Proton, Mangohud, etc.
    return {
      // STEAM_COMPAT_DATA_PATH: ...,
      // PROTON_USE_WINED3D: "1",
    };
  }

  /**
   * Recherche dans la bibliothèque
   */
  async searchGames(query: string): Promise<Game[]> {
    const allGames = await this.getAllGames();
    const lowerQuery = query.toLowerCase();

    return allGames.filter(
      (game) =>
        game.title.toLowerCase().includes(lowerQuery) ||
        game.developer?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Filtre les jeux par store
   */
  async getGamesByStore(store: StoreType): Promise<Game[]> {
    switch (store) {
      case "epic":
        return this.legendary.getStoredGames();
      case "gog":
        return this.gogdl.getStoredGames();
      case "amazon":
        return this.nile.getStoredGames();
      case "steam":
        return this.steam.getStoredGames();
      default:
        return [];
    }
  }

  /**
   * Récupère un jeu par son ID
   */
  async getGameById(gameId: string): Promise<Game | null> {
    const allGames = await this.getAllGames();
    return allGames.find((g) => g.id === gameId) ?? null;
  }

  /**
   * Met à jour les métadonnées d'un jeu (ex: favoris, temps de jeu)
   * Note: Les colonnes DB utilisent snake_case
   */
  async updateGameMetadata(
    gameId: string,
    updates: {
      isFavorite?: boolean;
      playTimeMinutes?: number;
      lastPlayed?: string;
    },
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.isFavorite !== undefined) {
      setClauses.push("is_favorite = ?");
      values.push(updates.isFavorite ? 1 : 0);
    }
    if (updates.playTimeMinutes !== undefined) {
      setClauses.push("play_time_minutes = ?");
      values.push(updates.playTimeMinutes);
    }
    if (updates.lastPlayed !== undefined) {
      setClauses.push("last_played = ?");
      values.push(updates.lastPlayed);
    }

    if (setClauses.length > 0) {
      values.push(gameId);
      await this.db.execute(
        `UPDATE games SET ${setClauses.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
        values,
      );
    }
  }

  /**
   * Supprime un jeu de la bibliothèque (ne le désinstalle pas)
   */
  async removeGameFromLibrary(gameId: string): Promise<void> {
    await this.db.execute("DELETE FROM games WHERE id = ?", [gameId]);
  }

  /**
   * Récupère les jeux récemment joués
   */
  async getRecentlyPlayed(limit: number = 10): Promise<Game[]> {
    const allGames = await this.getAllGames();

    return allGames
      .filter((g) => g.lastPlayed)
      .sort((a, b) => {
        const dateA = new Date(a.lastPlayed!).getTime();
        const dateB = new Date(b.lastPlayed!).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * Récupère les jeux favoris
   * Note: isFavorite doit être ajouté au type Game si utilisé
   */
  async getFavorites(): Promise<Game[]> {
    // Query directe sur la DB pour les IDs des favoris
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT id FROM games WHERE is_favorite = 1",
      [],
    );

    if (rows.length === 0) return [];

    // Récupérer les jeux complets et filtrer sur les IDs
    const allGames = await this.getAllGames();
    const favoriteIds = new Set(rows.map((r) => r.id as string));
    return allGames.filter((g) => favoriteIds.has(g.id));
  }
}
