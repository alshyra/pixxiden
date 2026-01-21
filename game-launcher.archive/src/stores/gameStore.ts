import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Game {
  id: string
  title: string
  executable: string
  installed?: boolean
  source?: string
  platform?: string
  cover_url?: string
}

// Sections de navigation
type Section = 'carousel' | 'grid'

export const useGameStore = defineStore('games', () => {
  // État
  const games = ref<Game[]>([])
  const selectedIndex = ref(0)
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)
  const gameRunning = ref(false)
  const gameLaunching = ref(false)
  const currentGameId = ref<string | null>(null)
  const currentGameTitle = ref<string | null>(null)
  const currentSection = ref<Section>('carousel')
  const overlayVisible = ref(false) // Visibilité de l'overlay du jeu
  const overlaySelectedButton = ref(0) // 0 = Retour au jeu, 1 = Force kill

  // Computed - Séparer les jeux installés des autres
  const installedGames = computed(() => games.value.filter(g => g.installed !== false))
  const otherGames = computed(() => games.value.filter(g => g.installed === false))
  
  // Jeu sélectionné basé sur la section active
  const selectedGame = computed(() => {
    if (currentSection.value === 'carousel') {
      return installedGames.value[selectedIndex.value] || null
    } else {
      return otherGames.value[selectedIndex.value] || null
    }
  })
  
  const gridColumns = 4

  // Actions
  function connectToBackend() {
    try {
      ws.value = new WebSocket('ws://localhost:8080/ws')
      
      ws.value.onopen = () => {
        console.log('✅ Connecté au backend Go')
        connected.value = true
      }

      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'game_list') {
            games.value = data.games
            console.log('📦 Liste des jeux reçue:', games.value.length)
          } else if (data.type === 'launch_result') {
            console.log('🎮 Résultat du lancement:', data)
            gameLaunching.value = false
            if (data.status === 'success') {
              console.log('✅ Jeu lancé avec succès')
            } else {
              console.error('❌ Échec du lancement:', data.error)
            }
          } else if (data.type === 'game_started') {
            console.log('🎮 Événement: Jeu démarré -', data.game_id)
            gameLaunching.value = false
            gameRunning.value = true
            overlayVisible.value = false // Masquer l'overlay au démarrage
            overlaySelectedButton.value = 0 // Reset sélection
            currentGameId.value = data.game_id
            // Trouver le titre du jeu
            const game = games.value.find(g => g.id === data.game_id)
            currentGameTitle.value = game?.title || 'Jeu en cours'
          } else if (data.type === 'game_ended') {
            console.log('🛑 Événement: Jeu terminé -', data.game_id)
            gameLaunching.value = false
            gameRunning.value = false
            overlayVisible.value = false
            overlaySelectedButton.value = 0
            currentGameId.value = null
            currentGameTitle.value = null
          } else if (data.type === 'home_button_pressed') {
            console.log('🏠 Bouton Home pressé - Toggle overlay')
            toggleOverlay()
          } else if (data.type === 'return_to_launcher_ack') {
            console.log('🏠 Retour au launcher confirmé')
          }
        } catch (error) {
          console.error('❌ Erreur parsing message:', error)
        }
      }

      ws.value.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error)
        connected.value = false
      }

      ws.value.onclose = () => {
        console.log('🔌 Déconnecté du backend')
        connected.value = false
        
        // Reconnexion automatique après 3 secondes
        setTimeout(() => {
          if (!connected.value) {
            console.log('🔄 Tentative de reconnexion...')
            connectToBackend()
          }
        }, 3000)
      }
    } catch (error) {
      console.error('❌ Erreur connexion WebSocket:', error)
    }
  }

  function launchGame(gameId: string) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      gameLaunching.value = true
      const message = JSON.stringify({
        type: 'launch_game',
        game_id: gameId
      })
      ws.value.send(message)
      console.log('🚀 Demande de lancement:', gameId)
    } else {
      console.error('❌ WebSocket non connecté')
    }
  }

  function navigateUp() {
    if (currentSection.value === 'carousel') {
      // Dans le carrousel, UP ne fait rien (ou pourrait aller vers un menu)
      return
    }
    // Dans la grid
    if (selectedIndex.value >= gridColumns) {
      selectedIndex.value -= gridColumns
    } else {
      // Aller vers le carrousel
      currentSection.value = 'carousel'
      selectedIndex.value = Math.min(selectedIndex.value, installedGames.value.length - 1)
    }
  }

  function navigateDown() {
    if (currentSection.value === 'carousel') {
      // Aller vers la grid si elle existe
      if (otherGames.value.length > 0) {
        currentSection.value = 'grid'
        selectedIndex.value = 0
      }
      return
    }
    // Dans la grid
    if (selectedIndex.value + gridColumns < otherGames.value.length) {
      selectedIndex.value += gridColumns
    }
  }

  function navigateLeft() {
    if (currentSection.value === 'carousel') {
      if (selectedIndex.value > 0) {
        selectedIndex.value -= 1
      } else {
        // Wrap around vers la fin avec animation
        selectedIndex.value = installedGames.value.length - 1
      }
    } else {
      if (selectedIndex.value > 0) {
        selectedIndex.value -= 1
      }
    }
  }

  function navigateRight() {
    if (currentSection.value === 'carousel') {
      if (selectedIndex.value < installedGames.value.length - 1) {
        selectedIndex.value += 1
      } else {
        // Wrap around vers le début avec animation
        selectedIndex.value = 0
      }
    } else {
      if (selectedIndex.value < otherGames.value.length - 1) {
        selectedIndex.value += 1
      }
    }
  }

  function launchSelected() {
    if (selectedGame.value) {
      launchGame(selectedGame.value.id)
    }
  }

  function returnToLauncher() {
    // Focus la fenêtre Tauri
    tauriShowWindow()
    
    // Envoyer message au backend
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'return_to_launcher'
      })
      ws.value.send(message)
      console.log('🏠 Demande de retour au launcher')
    }
  }

  async function tauriShowWindow() {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('show_window')
      console.log('👁️ Fenêtre affichée et focus')
    } catch (e) {
      console.warn('Tauri non disponible:', e)
    }
  }

  function stopCurrentGame() {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'stop_game'
      })
      ws.value.send(message)
      console.log('🛑 Demande d\'arrêt du jeu')
    }
  }

  function toggleOverlay() {
    overlayVisible.value = !overlayVisible.value
    overlaySelectedButton.value = 0 // Reset à "Retour au jeu"
    console.log(`🔄 Overlay ${overlayVisible.value ? 'affiché' : 'masqué'}`)
    
    // Focus la fenêtre quand on affiche l'overlay
    if (overlayVisible.value) {
      tauriShowWindow()
    }
  }

  function showOverlay() {
    overlayVisible.value = true
    overlaySelectedButton.value = 0
    tauriShowWindow()
  }

  function hideOverlay() {
    overlayVisible.value = false
  }

  function overlayNavigateLeft() {
    if (!overlayVisible.value) return
    overlaySelectedButton.value = Math.max(0, overlaySelectedButton.value - 1)
  }

  function overlayNavigateRight() {
    if (!overlayVisible.value) return
    overlaySelectedButton.value = Math.min(1, overlaySelectedButton.value + 1)
  }

  function overlayConfirm() {
    if (!overlayVisible.value) return
    if (overlaySelectedButton.value === 0) {
      hideOverlay() // Retour au jeu
    } else {
      stopCurrentGame() // Force kill
    }
  }

  return {
    // État
    games,
    installedGames,
    otherGames,
    selectedIndex,
    connected,
    selectedGame,
    gridColumns,
    gameRunning,
    gameLaunching,
    currentGameId,
    currentGameTitle,
    currentSection,
    overlayVisible,
    overlaySelectedButton,
    
    // Actions
    connectToBackend,
    launchGame,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    launchSelected,
    returnToLauncher,
    stopCurrentGame,
    toggleOverlay,
    showOverlay,
    hideOverlay,
    overlayNavigateLeft,
    overlayNavigateRight,
    overlayConfirm
  }
})
