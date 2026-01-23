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
