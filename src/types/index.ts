export interface Game {
  id: string
  title: string
  store: string
  storeId: string
  appId?: string // Alias for storeId in some contexts
  installed: boolean
  installPath?: string
  executablePath?: string
  backgroundUrl?: string
  developer?: string
  publisher?: string
  description?: string
  releaseDate?: string
  runner?: string
  playTime?: number // Alias for playTimeMinutes
  playTimeMinutes?: number
  lastPlayed?: string
  downloading?: boolean
  downloadProgress?: number
  createdAt?: string
  updatedAt?: string
}

/**
 * Enriched Game with full metadata from external APIs
 * Used by GameDetails and other views that need rich metadata
 */
export interface EnrichedGame {
  // Base info (from legendary/gogdl/nile)
  id: string
  title: string
  store: 'epic' | 'gog' | 'amazon' | 'steam' | string
  storeId: string
  installed: boolean
  installPath?: string
  winePrefix?: string
  wineVersion?: string
  
  // Metadata (from IGDB)
  description?: string
  metacriticScore?: number       // 0-100
  igdbRating?: number            // 0-100
  developer?: string
  publisher?: string
  genres: string[]
  releaseDate?: string
  summary?: string
  
  // Playtime (from HowLongToBeat)
  hltbMain?: number              // hours for main story
  hltbMainExtra?: number         // hours for main + extras
  hltbComplete?: number          // hours for 100% completion
  hltbSpeedrun?: number          // hours for speedrun (any%)
  
  // Compatibility (from ProtonDB)
  protonTier?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'borked' | 'native' | 'pending'
  protonConfidence?: string      // "good", "adequate", "low"
  protonTrendingTier?: string
  steamAppId?: number
  
  // Achievements
  achievementsTotal?: number
  achievementsUnlocked?: number
  
  // Assets (local file paths - use convertFileSrc to load)
  heroPath?: string
  gridPath?: string
  logoPath?: string
  iconPath?: string
  
  // Legacy URL assets (for backwards compatibility)
  coverUrl?: string
  backgroundUrl?: string
  
  // User data
  playTimeMinutes: number
  lastPlayed?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  enrichedAt?: string
}

/**
 * Cache statistics
 */
export interface CacheStats {
  gamesCount: number
  totalAssetsCount: number
  totalAssetsSizeMb: number
  cacheDir: string
}

/**
 * ProtonDB tier type for type-safe comparisons
 */
export type ProtonTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'borked' | 'native' | 'pending'

/**
 * ProtonDB tier utility functions
 */
export const ProtonTierUtils = {
  /** Get a score for the tier (higher is better) */
  getScore(tier: ProtonTier): number {
    const scores: Record<ProtonTier, number> = {
      native: 100,
      platinum: 90,
      gold: 75,
      silver: 50,
      bronze: 25,
      pending: 10,
      borked: 0,
    }
    return scores[tier] ?? 0
  },
  
  /** Check if the tier is considered playable */
  isPlayable(tier: ProtonTier): boolean {
    return ['native', 'platinum', 'gold', 'silver'].includes(tier)
  },
  
  /** Get the CSS color class for the tier */
  getColorClass(tier: ProtonTier): string {
    const colors: Record<ProtonTier, string> = {
      native: 'bg-blue-500',
      platinum: 'bg-cyan-400',
      gold: 'bg-yellow-400',
      silver: 'bg-gray-400',
      bronze: 'bg-orange-400',
      pending: 'bg-gray-600',
      borked: 'bg-red-500',
    }
    return colors[tier] ?? 'bg-gray-500'
  },
}

export interface Metadata {
  id: number
  gameId: string
  description: string
  developer: string
  publisher: string
  releaseDate: string
  genres: string[]
  coverUrl: string
  screenshots: string[]
}


export interface PlaySession {
  id: number
  gameId: string
  startTime: string
  endTime?: string
  duration: number
}

export interface Runner {
  type: 'wine' | 'proton' | 'native'
  name: string
  version: string
  path: string
}

export interface Store {
  id: string
  name: string
  enabled: boolean
  authenticated: boolean
}
