// ===== Game Sub-Interfaces (nested structure for clean data access) =====

export interface GameInfo {
  title: string;
  description: string;
  summary: string;
  metacriticScore: number;
  igdbRating: number;
  developer: string;
  publisher: string;
  genres: string[];
  releaseDate: string;
}

export interface GameAssets {
  heroPath: string;
  coverPath: string;
  gridPath: string;
  logoPath: string;
  iconPath: string;
  screenshotPaths: string[];
  backgroundUrl: string;
}

export interface InstallationData {
  installed: boolean;
  installPath: string;
  installSize: string;
  customExecutable: string;
  winePrefix: string;
  wineVersion: string;
  executablePath: string;
  customExecutablePath: string;
  runner: string;
}

export interface GameCompletionData {
  /** Average time (hours) for a fast/hasty playthrough — from IGDB game_time_to_beats.hastily */
  timeToBeatHastily: number;
  /** Average time (hours) for a normal playthrough — from IGDB game_time_to_beats.normally */
  timeToBeatNormally: number;
  /** Average time (hours) for 100% completion — from IGDB game_time_to_beats.completely */
  timeToBeatCompletely: number;

  // Achievements
  achievementsTotal?: number;
  achievementsUnlocked?: number;

  // User data
  playTimeMinutes: number;
  lastPlayed?: string;
  isFavorite: boolean;
  downloading?: boolean;
  downloadProgress?: number;
}

export interface GameProtonData {
  protonTier: ProtonTier;
  protonConfidence: string;
  protonTrendingTier: string;
  steamAppId: number;
}

export interface GameStoreData {
  store: StoreType;
  storeId: string;
}

/**
 * Game type — Unified game data with all metadata.
 *
 * Sub-objects use sensible defaults (empty strings, 0, false)
 * so consumers never need to check for undefined.
 *
 * Enrichment lifecycle:
 *   1. Store sync creates a Game with defaults via `createGame()`
 *   2. IGDB enrichment fills `info`, `gameCompletion` (time to beat), and `protonData.steamAppId`
 *   3. SteamGridDB enrichment fills `assets`
 *   4. ProtonDB enrichment fills `protonData` (uses steamAppId from IGDB)
 */
export interface Game {
  id: string;
  info: GameInfo;
  assets: GameAssets;
  installation: InstallationData;
  gameCompletion: GameCompletionData;
  protonData: GameProtonData;
  storeData: GameStoreData;
  createdAt: string;
  updatedAt: string;
  enrichedAt?: string;
}

// ===== Factory Functions =====

export function defaultGameInfo(title = ""): GameInfo {
  return {
    title,
    description: "",
    summary: "",
    metacriticScore: 0,
    igdbRating: 0,
    developer: "",
    publisher: "",
    genres: [],
    releaseDate: "",
  };
}

export function defaultGameAssets(): GameAssets {
  return {
    heroPath: "",
    coverPath: "",
    gridPath: "",
    logoPath: "",
    iconPath: "",
    screenshotPaths: [],
    backgroundUrl: "",
  };
}

export function defaultInstallationData(): InstallationData {
  return {
    installed: false,
    installPath: "",
    installSize: "",
    customExecutable: "",
    winePrefix: "",
    wineVersion: "",
    executablePath: "",
    customExecutablePath: "",
    runner: "",
  };
}

export function defaultGameCompletionData(): GameCompletionData {
  return {
    timeToBeatHastily: 0,
    timeToBeatNormally: 0,
    timeToBeatCompletely: 0,
    playTimeMinutes: 0,
    isFavorite: false,
  };
}

export function defaultGameProtonData(): GameProtonData {
  return {
    protonTier: "pending",
    protonConfidence: "",
    protonTrendingTier: "",
    steamAppId: 0,
  };
}

export function defaultGameStoreData(store: StoreType = "epic", storeId = ""): GameStoreData {
  return { store, storeId };
}

/** Create a Game with all defaults — convenience for store services */
export function createGame(overrides: {
  id: string;
  store: StoreType;
  storeId: string;
  title: string;
  installed?: boolean;
  installPath?: string;
  installSize?: string;
  executablePath?: string;
  developer?: string;
  genres?: string[];
  playTimeMinutes?: number;
}): Game {
  const now = new Date().toISOString();
  return {
    id: overrides.id,
    info: {
      ...defaultGameInfo(overrides.title),
      developer: overrides.developer ?? "",
      genres: overrides.genres ?? [],
    },
    assets: defaultGameAssets(),
    installation: {
      ...defaultInstallationData(),
      installed: overrides.installed ?? false,
      installPath: overrides.installPath ?? "",
      installSize: overrides.installSize ?? "",
      executablePath: overrides.executablePath ?? "",
    },
    gameCompletion: {
      ...defaultGameCompletionData(),
      playTimeMinutes: overrides.playTimeMinutes ?? 0,
    },
    protonData: defaultGameProtonData(),
    storeData: defaultGameStoreData(overrides.store, overrides.storeId),
    createdAt: now,
    updatedAt: now,
  };
}

// ===== Other Types =====

/**
 * Cache statistics
 */
export interface CacheStats {
  gamesCount: number;
  totalAssetsCount: number;
  totalAssetsSizeMb: number;
  cacheDir: string;
}

/**
 * ProtonDB tier type for type-safe comparisons
 */
export type ProtonTier =
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "borked"
  | "native"
  | "pending";

// ===== Store Authentication Types =====

export type StoreType = "epic" | "gog" | "amazon" | "steam";

export type ConfigSource = "pixxiden" | "heroic" | "none";

export interface AuthStatus {
  authenticated: boolean;
  username?: string;
  configSource: ConfigSource;
}
