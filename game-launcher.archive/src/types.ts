// Types pour les messages WebSocket

export interface Game {
  id: string
  title: string
  executable: string
}

export interface WSMessageGameList {
  type: 'game_list'
  games: Game[]
}

export interface WSMessageLaunchGame {
  type: 'launch_game'
  game_id: string
}

export interface WSMessageLaunchResult {
  type: 'launch_result'
  game_id: string
  status: 'success' | 'error'
  error?: string
}

export type WSMessage = 
  | WSMessageGameList 
  | WSMessageLaunchGame 
  | WSMessageLaunchResult

// Types pour le store
export interface GameStoreState {
  games: Game[]
  selectedIndex: number
  connected: boolean
  ws: WebSocket | null
}

// Utilitaires de navigation
export type NavigationDirection = 'up' | 'down' | 'left' | 'right'
