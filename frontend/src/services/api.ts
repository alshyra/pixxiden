import axios from 'axios'
import type { Game } from '@/types'

const API_BASE_URL = 'http://localhost:9090/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Games API

export async function getGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>('/games')
  return response.data
}

export async function syncGames(): Promise<void> {
  await apiClient.post('/games/sync')
}

export async function launchGame(gameId: string): Promise<void> {
  await apiClient.post('/games/launch', { app_id: gameId })
}

export async function installGame(gameId: string, installPath?: string): Promise<void> {
  const body: { app_id: string; install_path?: string } = { app_id: gameId }
  if (installPath) {
    body.install_path = installPath
  }
  await apiClient.post('/games/install', body)
}

export async function uninstallGame(gameId: string): Promise<void> {
  await apiClient.delete(`/games/${gameId}`)
}

// Store API

export async function authenticateLegendary(): Promise<void> {
  await apiClient.post('/stores/legendary/auth')
}

export async function checkLegendaryStatus(): Promise<{ authenticated: boolean }> {
  const response = await apiClient.get('/stores/legendary/status')
  return response.data
}

// Health Check

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await apiClient.get('/health')
  return response.data
}
