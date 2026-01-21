<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import GameGrid from './components/GameGrid.vue'

const gameStore = useGameStore()

// État pour le gamepad
const gamepadConnected = ref(false)
const gamepadName = ref('')
let animationFrameId: number | null = null

// Fonction pour interagir avec Tauri (lazy load)
async function tauriInvoke(cmd: string) {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke(cmd)
  } catch (e) {
    console.warn('Tauri non disponible:', e)
  }
}

// Note : On ne masque plus automatiquement la fenêtre quand un jeu tourne
// L'utilisateur peut Alt+Tab ou utiliser Home/PS pour revenir au launcher

// Configuration du gamepad
const DEAD_ZONE = 0.4 // Zone morte pour les sticks analogiques
const REPEAT_DELAY = 150 // Délai entre les répétitions (ms)
const INITIAL_DELAY = 300 // Délai avant la première répétition (ms)

// État de la dernière action pour gérer la répétition
let lastAction: string | null = null
let lastActionTime = 0
let actionStartTime = 0

// État des boutons/axes pour détecter les changements d'état (press vs hold)
let lastDpadUp = false
let lastDpadDown = false
let lastDpadLeft = false
let lastDpadRight = false
let lastLeftStickActive = false
let lastButtonA = false
let lastButtonB = false
let lastButtonStart = false
let lastButtonHome = false

// Indices des boutons selon le standard Gamepad API
const BUTTON_MAP = {
  A: 0,           // Bouton A (lancer)
  B: 1,           // Bouton B (retour)
  X: 2,           // Bouton X
  Y: 3,           // Bouton Y
  LB: 4,          // Bouton gauche
  RB: 5,          // Bouton droit
  LT: 6,          // Gâchette gauche
  RT: 7,          // Gâchette droite
  SELECT: 8,      // Select/Back
  START: 9,       // Start/Menu
  L3: 10,         // Stick gauche (clic)
  R3: 11,         // Stick droit (clic)
  DPAD_UP: 12,    // D-pad haut
  DPAD_DOWN: 13,  // D-pad bas
  DPAD_LEFT: 14,  // D-pad gauche
  DPAD_RIGHT: 15, // D-pad droite
  HOME: 16        // Home/PS/Guide button
}

// Indices des axes
const AXIS_MAP = {
  LEFT_STICK_X: 0,  // Stick gauche X (-1 = gauche, 1 = droite)
  LEFT_STICK_Y: 1,  // Stick gauche Y (-1 = haut, 1 = bas)
  RIGHT_STICK_X: 2, // Stick droit X
  RIGHT_STICK_Y: 3  // Stick droit Y
}

// Gestion de la navigation au clavier (fallback)
function handleKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      gameStore.navigateUp()
      break
    case 'ArrowDown':
      event.preventDefault()
      gameStore.navigateDown()
      break
    case 'ArrowLeft':
      event.preventDefault()
      gameStore.navigateLeft()
      break
    case 'ArrowRight':
      event.preventDefault()
      gameStore.navigateRight()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      gameStore.launchSelected()
      break
    case 'Escape':
      event.preventDefault()
      console.log('ESC pressed - could close app or show menu')
      break
  }
}

// Détecter la connexion/déconnexion de gamepad
function handleGamepadConnected(event: GamepadEvent) {
  console.log('🎮 Gamepad connecté:', event.gamepad.id)
  gamepadConnected.value = true
  gamepadName.value = event.gamepad.id
}

function handleGamepadDisconnected(event: GamepadEvent) {
  console.log('🎮 Gamepad déconnecté:', event.gamepad.id)
  gamepadConnected.value = false
  gamepadName.value = ''
}

// Vérifier si un bouton est pressé (avec seuil pour les gâchettes)
function isButtonPressed(button: GamepadButton): boolean {
  return button.pressed || button.value > 0.5
}

// Gérer la répétition des actions
function canRepeatAction(action: string): boolean {
  const now = Date.now()
  
  if (action !== lastAction) {
    // Nouvelle action
    lastAction = action
    lastActionTime = now
    actionStartTime = now
    return true
  }
  
  // Même action - vérifier le timing
  const timeSinceStart = now - actionStartTime
  const timeSinceLast = now - lastActionTime
  
  // Si c'est la première répétition, attendre INITIAL_DELAY
  if (timeSinceStart < INITIAL_DELAY) {
    return false
  }
  
  // Sinon, répéter selon REPEAT_DELAY
  if (timeSinceLast >= REPEAT_DELAY) {
    lastActionTime = now
    return true
  }
  
  return false
}

// Réinitialiser l'état de l'action
function resetAction() {
  lastAction = null
  lastActionTime = 0
  actionStartTime = 0
}

// Polling du gamepad (appelé à chaque frame)
function pollGamepad() {
  const gamepads = navigator.getGamepads()
  
  // Chercher le premier gamepad connecté
  for (const gamepad of gamepads) {
    if (!gamepad) continue
    
    const now = Date.now()
    
    // === D-PAD NAVIGATION ===
    // Chaque bouton D-Pad crée une action UNIQUE à chaque press+hold
    const dpadUp = isButtonPressed(gamepad.buttons[BUTTON_MAP.DPAD_UP])
    const dpadDown = isButtonPressed(gamepad.buttons[BUTTON_MAP.DPAD_DOWN])
    const dpadLeft = isButtonPressed(gamepad.buttons[BUTTON_MAP.DPAD_LEFT])
    const dpadRight = isButtonPressed(gamepad.buttons[BUTTON_MAP.DPAD_RIGHT])
    
    // UP
    if (dpadUp && (lastAction !== 'dpad-up' || canRepeatAction('dpad-up'))) {
      if (!gameStore.overlayVisible) {
        gameStore.navigateUp()
      }
      lastAction = 'dpad-up'
      lastActionTime = now
      if (!lastDpadUp) actionStartTime = now
    }
    lastDpadUp = dpadUp
    
    // DOWN
    if (dpadDown && (lastAction !== 'dpad-down' || canRepeatAction('dpad-down'))) {
      if (!gameStore.overlayVisible) {
        gameStore.navigateDown()
      }
      lastAction = 'dpad-down'
      lastActionTime = now
      if (!lastDpadDown) actionStartTime = now
    }
    lastDpadDown = dpadDown
    
    // LEFT
    if (dpadLeft && (lastAction !== 'dpad-left' || canRepeatAction('dpad-left'))) {
      if (gameStore.overlayVisible) {
        gameStore.overlayNavigateLeft()
      } else {
        gameStore.navigateLeft()
      }
      lastAction = 'dpad-left'
      lastActionTime = now
      if (!lastDpadLeft) actionStartTime = now
    }
    lastDpadLeft = dpadLeft
    
    // RIGHT
    if (dpadRight && (lastAction !== 'dpad-right' || canRepeatAction('dpad-right'))) {
      if (gameStore.overlayVisible) {
        gameStore.overlayNavigateRight()
      } else {
        gameStore.navigateRight()
      }
      lastAction = 'dpad-right'
      lastActionTime = now
      if (!lastDpadRight) actionStartTime = now
    }
    lastDpadRight = dpadRight
    
    // === STICK ANALOGIQUE GAUCHE ===
    const leftStickX = gamepad.axes[AXIS_MAP.LEFT_STICK_X]
    const leftStickY = gamepad.axes[AXIS_MAP.LEFT_STICK_Y]
    const leftStickActive = Math.abs(leftStickX) > DEAD_ZONE || Math.abs(leftStickY) > DEAD_ZONE
    
    if (leftStickActive) {
      // Déterminer la direction principale
      if (Math.abs(leftStickY) > Math.abs(leftStickX)) {
        // Mouvement vertical - seulement si overlay pas visible
        if (!gameStore.overlayVisible) {
          if (leftStickY < -DEAD_ZONE) {
            if (lastAction !== 'stick-up' || canRepeatAction('stick-up')) {
              gameStore.navigateUp()
              lastAction = 'stick-up'
              lastActionTime = now
              if (!lastLeftStickActive) actionStartTime = now
            }
          } else if (leftStickY > DEAD_ZONE) {
            if (lastAction !== 'stick-down' || canRepeatAction('stick-down')) {
              gameStore.navigateDown()
              lastAction = 'stick-down'
              lastActionTime = now
              if (!lastLeftStickActive) actionStartTime = now
            }
          }
        }
      } else {
        // Mouvement horizontal
        if (leftStickX < -DEAD_ZONE) {
          if (lastAction !== 'stick-left' || canRepeatAction('stick-left')) {
            if (gameStore.overlayVisible) {
              gameStore.overlayNavigateLeft()
            } else {
              gameStore.navigateLeft()
            }
            lastAction = 'stick-left'
            lastActionTime = now
            if (!lastLeftStickActive) actionStartTime = now
          }
        } else if (leftStickX > DEAD_ZONE) {
          if (lastAction !== 'stick-right' || canRepeatAction('stick-right')) {
            if (gameStore.overlayVisible) {
              gameStore.overlayNavigateRight()
            } else {
              gameStore.navigateRight()
            }
            lastAction = 'stick-right'
            lastActionTime = now
            if (!lastLeftStickActive) actionStartTime = now
          }
        }
      }
    } else if (lastLeftStickActive) {
      // Stick relâché
      resetAction()
    }
    lastLeftStickActive = leftStickActive
    
    // === BOUTONS D'ACTION ===
    // Bouton A - Lancer le jeu ou confirmer dans l'overlay
    const buttonA = isButtonPressed(gamepad.buttons[BUTTON_MAP.A])
    if (buttonA && !lastButtonA) {
      if (gameStore.overlayVisible) {
        gameStore.overlayConfirm()
      } else {
        gameStore.launchSelected()
      }
      lastAction = 'launch'
      lastActionTime = now
      actionStartTime = now
    }
    lastButtonA = buttonA
    
    // Bouton B - Retour (une seule fois au press)
    const buttonB = isButtonPressed(gamepad.buttons[BUTTON_MAP.B])
    if (buttonB && !lastButtonB) {
      console.log('🔙 Bouton B - Retour')
      lastAction = 'back'
      lastActionTime = now
      actionStartTime = now
    }
    lastButtonB = buttonB
    
    // Bouton START - Menu (une seule fois au press)
    const buttonStart = isButtonPressed(gamepad.buttons[BUTTON_MAP.START])
    if (buttonStart && !lastButtonStart) {
      console.log('☰ Menu')
      lastAction = 'menu'
      lastActionTime = now
      actionStartTime = now
    }
    lastButtonStart = buttonStart
    
    // Bouton HOME/PS (Guide) - Revenir au launcher (sans tuer le jeu)
    const buttonHome = gamepad.buttons[BUTTON_MAP.HOME] && isButtonPressed(gamepad.buttons[BUTTON_MAP.HOME])
    if (buttonHome && !lastButtonHome) {
      console.log('🏠 Bouton Home - Retour au launcher')
      // Focus la fenêtre via Tauri (ne tue PAS le jeu)
      tauriInvoke('show_window')
      lastAction = 'home'
      lastActionTime = now
      actionStartTime = now
    }
    lastButtonHome = buttonHome
    
    // On ne gère qu'un seul gamepad à la fois
    break
  }
  
  // Continuer le polling
  animationFrameId = requestAnimationFrame(pollGamepad)
}

onMounted(() => {
  // Connexion au backend
  gameStore.connectToBackend()
  
  // === GAMEPAD SETUP ===
  // Écouter les événements de connexion/déconnexion
  window.addEventListener('gamepadconnected', handleGamepadConnected)
  window.addEventListener('gamepaddisconnected', handleGamepadDisconnected)
  
  // Vérifier si un gamepad est déjà connecté
  const gamepads = navigator.getGamepads()
  for (const gamepad of gamepads) {
    if (gamepad) {
      console.log('🎮 Gamepad déjà connecté:', gamepad.id)
      gamepadConnected.value = true
      gamepadName.value = gamepad.id
      break
    }
  }
  
  // Démarrer le polling du gamepad
  animationFrameId = requestAnimationFrame(pollGamepad)
  
  // === KEYBOARD FALLBACK ===
  window.addEventListener('keydown', handleKeyDown)
  
  console.log('🎮 Game Launcher initialisé (Gamepad-first mode)')
})

onUnmounted(() => {
  // Nettoyer les listeners
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('gamepadconnected', handleGamepadConnected)
  window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected)
  
  // Arrêter le polling
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="w-screen h-screen">
    <GameGrid 
      :gamepad-connected="gamepadConnected"
      :gamepad-name="gamepadName"
    />
  </div>
</template>

<style scoped>
/* Pas de styles spécifiques nécessaires ici */
</style>
