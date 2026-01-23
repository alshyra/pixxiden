import type { Game } from '@/types'

// Demo games for development/testing when backend is not available
export const demoGames: Game[] = [
  {
    id: '1',
    title: 'DREDGE',
    storeId: 'gog',
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
    storeId: 'epic',
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
    storeId: 'epic',
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

export function useDemoGames() {
  return {
    games: demoGames,
    getGame: (id: string) => demoGames.find(g => g.id === id)
  }
}
