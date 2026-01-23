import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

export type ControllerType = 'keyboard' | 'ps' | 'xbox'

export interface FooterButton {
  key: 'A' | 'B' | 'S' | 'X' | 'Y'
  label: string
  action: string
}

const buttonIcons: Record<ControllerType, Record<string, string>> = {
  keyboard: { A: 'A', B: 'B', S: 'S', X: 'X', Y: 'Y' },
  ps: { A: '✕', B: '○', S: 'SELECT', X: '□', Y: '△' },
  xbox: { A: 'A', B: 'B', S: 'BACK', X: 'X', Y: 'Y' }
}

export function useFooterControls() {
  const route = useRoute()
  const controllerType = ref<ControllerType>('keyboard')
  const isConnected = ref(true) // Assume connected by default

  // Detect controller type based on connected gamepad
  function detectController() {
    const gamepads = navigator.getGamepads()
    
    for (const gamepad of gamepads) {
      if (!gamepad) continue
      
      const id = gamepad.id.toLowerCase()
      
      if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense') || id.includes('sony')) {
        controllerType.value = 'ps'
        return
      }
      
      if (id.includes('xbox') || id.includes('microsoft')) {
        controllerType.value = 'xbox'
        return
      }
    }
    
    // Default to keyboard if no gamepad detected
    controllerType.value = 'keyboard'
  }

  // Dynamic buttons based on current route
  const buttons = computed<FooterButton[]>(() => {
    const routeName = route.name as string
    
    switch (routeName) {
      case 'library':
      case 'library-grid':
        return [
          { key: 'A', label: 'Sélectionner', action: 'select' },
          { key: 'B', label: 'Retour', action: 'back' },
          { key: 'S', label: 'Paramètres', action: 'settings' }
        ]
      
      case 'settings':
        return [
          { key: 'A', label: 'Modifier', action: 'edit' },
          { key: 'B', label: 'Retour', action: 'back' }
        ]
      
      case 'game-detail':
        return [
          { key: 'A', label: 'Lancer', action: 'play' },
          { key: 'B', label: 'Retour', action: 'back' },
          { key: 'X', label: 'Options', action: 'options' }
        ]
      
      case 'downloads':
        return [
          { key: 'A', label: 'Détails', action: 'details' },
          { key: 'B', label: 'Retour', action: 'back' },
          { key: 'X', label: 'Annuler', action: 'cancel' }
        ]
      
      default:
        return [
          { key: 'A', label: 'Confirmer', action: 'confirm' },
          { key: 'B', label: 'Retour', action: 'back' }
        ]
    }
  })

  // Get the display icon for a button based on controller type
  function getButtonIcon(key: string): string {
    const icons = buttonIcons[controllerType.value]
    return icons[key] || key
  }

  // Get CSS class for button styling based on controller type
  function getButtonClass(key: string): string {
    const baseClass = 'controller-btn'
    
    if (controllerType.value === 'ps') {
      switch (key) {
        case 'A': return `${baseClass} btn-ps-cross`
        case 'B': return `${baseClass} btn-ps-circle`
        case 'S': return `${baseClass} btn-ps-select`
        case 'X': return `${baseClass} btn-ps-square`
        case 'Y': return `${baseClass} btn-ps-triangle`
        default: return baseClass
      }
    }
    
    if (controllerType.value === 'xbox') {
      switch (key) {
        case 'A': return `${baseClass} btn-xbox-a`
        case 'B': return `${baseClass} btn-xbox-b`
        case 'S': return `${baseClass} btn-xbox-back`
        case 'X': return `${baseClass} btn-xbox-x`
        case 'Y': return `${baseClass} btn-xbox-y`
        default: return baseClass
      }
    }
    
    return `${baseClass} btn-keyboard`
  }

  let gamepadPollInterval: ReturnType<typeof setInterval> | null = null
  let previousGamepadCount = 0

  function onGamepadConnected() {
    detectController()
  }

  function onGamepadDisconnected() {
    // Re-check for remaining gamepads
    const gamepads = navigator.getGamepads()
    const connectedCount = gamepads.filter(g => g !== null).length
    
    if (connectedCount === 0) {
      controllerType.value = 'keyboard'
    } else {
      detectController()
    }
  }

  // Poll for gamepad changes (some browsers don't fire events)
  function pollGamepads() {
    const gamepads = navigator.getGamepads()
    const connectedCount = gamepads.filter(g => g !== null).length
    
    if (connectedCount !== previousGamepadCount) {
      previousGamepadCount = connectedCount
      detectController()
    }
  }

  onMounted(() => {
    // Initial detection
    detectController()
    
    // Listen for gamepad events
    window.addEventListener('gamepadconnected', onGamepadConnected)
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected)
    
    // Poll for changes every second (fallback)
    gamepadPollInterval = setInterval(pollGamepads, 1000)
  })

  onUnmounted(() => {
    window.removeEventListener('gamepadconnected', onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', onGamepadDisconnected)
    
    if (gamepadPollInterval) {
      clearInterval(gamepadPollInterval)
    }
  })

  return {
    buttons,
    controllerType,
    isConnected,
    getButtonIcon,
    getButtonClass,
    detectController
  }
}
