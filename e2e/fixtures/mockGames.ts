/**
 * Mock games data for E2E testing (LEGACY)
 * 
 * NOTE: These mocks are DEPRECATED. New E2E tests should use real backend data.
 * This file is kept for backwards compatibility with legacy tests.
 * 
 * @deprecated Use real backend data instead of mocks
 */

// Local type for mock games (doesn't depend on main Game type)
interface MockGame {
  id: string
  title: string
  store: string
  storeId: string
  appId?: string // Legacy field
  installed: boolean
  installPath?: string
  executablePath?: string
  playTime?: number
  lastPlayed?: string
  backgroundUrl?: string
  genres?: string[]
  playTimeMinutes?: number
  createdAt?: string
  updatedAt?: string
}

export const mockGames: MockGame[] = [
  {
    id: '1',
    title: 'DREDGE',
    store: 'gog',
    storeId: 'dredge-gog',
    appId: 'dredge-gog',
    installed: true,
    installPath: '/games/dredge',
    executablePath: '/games/dredge/dredge.exe',
    playTime: 2229, // 37h 9m
    lastPlayed: '2025-06-14',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.webp'
  },
  {
    id: '2',
    title: 'Call of Duty',
    store: 'epic',
    storeId: 'cod-epic',
    appId: 'cod-epic',
    installed: false,
    installPath: '',
    executablePath: '',
    playTime: 0,
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wkb.webp'
  },
  {
    id: '3',
    title: 'Fortnite',
    store: 'epic',
    storeId: 'fortnite-epic',
    appId: 'fortnite-epic',
    installed: true,
    installPath: '/games/fortnite',
    executablePath: '/games/fortnite/fortnite.exe',
    playTime: 4800,
    lastPlayed: '2025-01-15',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3wk8.webp'
  },
  {
    id: '4',
    title: 'Sea of Thieves',
    store: 'amazon',
    storeId: 'amazon',
    appId: 'sot-amazon',
    installed: true,
    installPath: '/games/seaofthieves',
    executablePath: '/games/seaofthieves/sot.exe',
    playTime: 1200,
    lastPlayed: '2025-01-10',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.webp'
  },
  {
    id: '5',
    title: 'Splitgate 2',
    store: 'epic',
    storeId: 'epic',
    appId: 'splitgate2-epic',
    installed: false,
    installPath: '',
    executablePath: '',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7t7d.webp'
  },
  {
    id: '6',
    title: 'The Elder Scrolls IV: Oblivion Remastered',
    store: 'gog',
    storeId: 'gog',
    appId: 'oblivion-gog',
    installed: true,
    installPath: '/games/oblivion',
    executablePath: '/games/oblivion/oblivion.exe',
    playTime: 2229,
    lastPlayed: '2025-06-14',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8eup.webp'
  },
  {
    id: '7',
    title: 'Red Dead Redemption 2',
    store: 'epic',
    storeId: 'epic',
    appId: 'rdr2-epic',
    installed: true,
    installPath: '/games/rdr2',
    executablePath: '/games/rdr2/rdr2.exe',
    playTime: 8400,
    lastPlayed: '2024-12-20',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.webp'
  },
  {
    id: '8',
    title: 'Battlefield 3',
    store: 'amazon',
    storeId: 'amazon',
    appId: 'bf3-amazon',
    installed: false,
    installPath: '',
    executablePath: '',
    playTime: 9753,
    lastPlayed: '2019-11-17',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1xbu.webp'
  },
  {
    id: '9',
    title: 'Black Myth: Wukong',
    store: 'epic',
    storeId: 'epic',
    appId: 'wukong-epic',
    installed: true,
    installPath: '/games/wukong',
    executablePath: '/games/wukong/wukong.exe',
    playTime: 3600,
    lastPlayed: '2025-01-18',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5zih.webp'
  },
  {
    id: '10',
    title: 'Helldivers 2',
    store: 'epic',
    storeId: 'epic',
    appId: 'helldivers2-epic',
    installed: true,
    installPath: '/games/helldivers2',
    executablePath: '/games/helldivers2/helldivers2.exe',
    playTime: 2100,
    lastPlayed: '2025-01-16',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6t6s.webp'
  },
  {
    id: '11',
    title: 'Hogwarts Legacy',
    store: 'epic',
    storeId: 'epic',
    appId: 'hogwarts-epic',
    installed: false,
    installPath: '',
    executablePath: '',
    playTime: 4200,
    lastPlayed: '2024-06-10',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmk.webp'
  },
  {
    id: '12',
    title: 'Kerbal Space Program',
    store: 'gog',
    storeId: 'gog',
    appId: 'ksp-gog',
    installed: true,
    installPath: '/games/ksp',
    executablePath: '/games/ksp/ksp.exe',
    playTime: 12000,
    lastPlayed: '2025-01-05',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1m2x.webp'
  },
  {
    id: '13',
    title: 'Little Kitty, Big City',
    store: 'gog',
    storeId: 'gog',
    appId: 'littlekitty-gog',
    installed: true,
    installPath: '/games/littlekitty',
    executablePath: '/games/littlekitty/kitty.exe',
    playTime: 480,
    lastPlayed: '2025-01-12',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6n2t.webp'
  },
  {
    id: '14',
    title: "Luigi's Mansion 3",
    store: 'amazon',
    storeId: 'amazon',
    appId: 'luigis-amazon',
    installed: false,
    installPath: '',
    executablePath: '',
    playTime: 1800,
    lastPlayed: '2024-10-31',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8d.webp'
  },
  {
    id: '15',
    title: 'Portal 2',
    store: 'gog',
    storeId: 'gog',
    appId: 'portal2-gog',
    installed: true,
    installPath: '/games/portal2',
    executablePath: '/games/portal2/portal2.exe',
    playTime: 960,
    lastPlayed: '2024-08-15',
    backgroundUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs4.webp'
  }
]

/**
 * Get games filtered by store
 */
export function getGamesByStore(store: string): MockGame[] {
  return mockGames.filter(g => g.store === store)
}

/**
 * Get installed games
 */
export function getInstalledGames(): MockGame[] {
  return mockGames.filter(g => g.installed)
}

/**
 * Get not installed games
 */
export function getNotInstalledGames(): MockGame[] {
  return mockGames.filter(g => !g.installed)
}

/**
 * Get a specific game by ID
 */
export function getGameById(id: string): MockGame | undefined {
  return mockGames.find(g => g.id === id)
}

/**
 * Get recently played games (last 30 days)
 */
export function getRecentlyPlayedGames(): MockGame[] {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  return mockGames.filter(g => {
    if (!g.lastPlayed) return false
    return new Date(g.lastPlayed) >= thirtyDaysAgo
  })
}

/**
 * Store statistics
 */
export const storeStats = {
  epic: getGamesByStore('epic').length,
  gog: getGamesByStore('gog').length,
  amazon: getGamesByStore('amazon').length,
  steam: getGamesByStore('steam').length,
  total: mockGames.length,
  installed: getInstalledGames().length,
  notInstalled: getNotInstalledGames().length
}
