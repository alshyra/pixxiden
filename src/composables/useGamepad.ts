import { ref, onMounted, onUnmounted, readonly } from 'vue'
import { useRouter } from 'vue-router'

export type ControllerType = 'keyboard' | 'ps' | 'xbox'

export interface GamepadState {
  connected: boolean
  type: ControllerType
  name: string
}

// Standard button indices (matches Web Gamepad API)
export const GAMEPAD_BUTTONS = {
  // Face buttons
  A: 0,           // Cross (PS) / A (Xbox) - Confirm/Select
  B: 1,           // Circle (PS) / B (Xbox) - Back/Cancel
  X: 2,           // Square (PS) / X (Xbox) - Options
  Y: 3,           // Triangle (PS) / Y (Xbox) - Info
  
  // Shoulder buttons
  LB: 4,          // L1 (PS) / LB (Xbox)
  RB: 5,          // R1 (PS) / RB (Xbox)
  LT: 6,          // L2 (PS) / LT (Xbox)
  RT: 7,          // R2 (PS) / RT (Xbox)
  
  // Center buttons
  SELECT: 8,      // Share/Select (PS) / Back (Xbox)
  START: 9,       // Options/Start (PS) / Start (Xbox)
  
  // Stick buttons
  L3: 10,         // L3 (PS) / LS (Xbox)
  R3: 11,         // R3 (PS) / RS (Xbox)
  
  // D-Pad
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  
  // Guide button
  GUIDE: 16       // PS Button / Xbox Button
} as const

// Axis indices
export const GAMEPAD_AXES = {
  LEFT_X: 0,
  LEFT_Y: 1,
  RIGHT_X: 2,
  RIGHT_Y: 3
} as const

// Global state (shared between all composable instances)
const globalState = ref<GamepadState>({
  connected: false,
  type: 'keyboard',
  name: ''
})

// Track if global listener is already registered
let isGlobalListenerRegistered = false
let gamepadPollInterval: ReturnType<typeof setInterval> | null = null
let previousButtonStates: boolean[] = []
let previousAxes: number[] = [0, 0, 0, 0]
let lastNavigationTime = 0
const navigationThreshold = 150 // ms between navigations

// Event handlers registry
type GamepadEventType = 'navigate' | 'confirm' | 'back' | 'options' | 'info' | 'lb' | 'rb' | 'lt' | 'rt' | 'start' | 'select'
const eventHandlers = new Map<GamepadEventType, Set<(data?: any) => void>>()

function emit(event: GamepadEventType, data?: any) {
  const handlers = eventHandlers.get(event)
  if (handlers) {
    handlers.forEach(handler => handler(data))
  }
}

function detectControllerType(gamepad: Gamepad): ControllerType {
  const id = gamepad.id.toLowerCase()
  
  // PlayStation controllers - check first as they're more specific
  // DualSense (PS5): "DualSense Wireless Controller"
  // DualShock 4 (PS4): "Wireless Controller" or "DUALSHOCK 4"
  // Vendor ID 054c = Sony
  if (id.includes('playstation') || 
      id.includes('dualshock') || 
      id.includes('dualsense') || 
      id.includes('dual sense') ||
      id.includes('sony') || 
      id.includes('ps4') || 
      id.includes('ps5') || 
      id.includes('054c') ||
      // Linux often reports PS controllers as "Wireless Controller" with vendor 054c
      (id.includes('wireless controller') && !id.includes('xbox'))) {
    return 'ps'
  }
  
  // Xbox controllers
  // Vendor ID 045e = Microsoft
  if (id.includes('xbox') || id.includes('microsoft') || id.includes('xinput') || id.includes('045e')) {
    return 'xbox'
  }
  
  // Default to Xbox layout for unknown controllers
  return 'xbox'
}

// Check if Gamepad API is available
function isGamepadApiAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
}

function updateGamepadState() {
  if (!isGamepadApiAvailable()) return
  
  try {
    const gamepads = navigator.getGamepads()
    
    for (const gamepad of gamepads) {
      if (!gamepad) continue
      
      globalState.value = {
        connected: true,
        type: detectControllerType(gamepad),
        name: gamepad.id
      }
      return
    }
  } catch (e) {
    // Ignore errors (e.g., in test environment)
  }
  
  // No gamepad connected
  globalState.value = {
    connected: false,
    type: 'keyboard',
    name: ''
  }
}

function processGamepadInput(router: ReturnType<typeof useRouter>) {
  if (!isGamepadApiAvailable()) return
  
  try {
    const now = Date.now()
    const gamepads = navigator.getGamepads()
    const gamepad = gamepads[0]
    
    if (!gamepad) return
    
    const threshold = 0.5
    const canNavigate = now - lastNavigationTime > navigationThreshold
    
    // Get current axes
    const leftX = gamepad.axes[GAMEPAD_AXES.LEFT_X] || 0
    const leftY = gamepad.axes[GAMEPAD_AXES.LEFT_Y] || 0
    
    // Detect stick movement (only on initial threshold crossing)
  const moveLeft = leftX < -threshold && Math.abs(previousAxes[0]) < threshold
  const moveRight = leftX > threshold && Math.abs(previousAxes[0]) < threshold
  const moveUp = leftY < -threshold && Math.abs(previousAxes[1]) < threshold
  const moveDown = leftY > threshold && Math.abs(previousAxes[1]) < threshold
  
  // D-pad states
  const dpadUp = gamepad.buttons[GAMEPAD_BUTTONS.DPAD_UP]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.DPAD_UP]
  const dpadDown = gamepad.buttons[GAMEPAD_BUTTONS.DPAD_DOWN]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.DPAD_DOWN]
  const dpadLeft = gamepad.buttons[GAMEPAD_BUTTONS.DPAD_LEFT]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.DPAD_LEFT]
  const dpadRight = gamepad.buttons[GAMEPAD_BUTTONS.DPAD_RIGHT]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.DPAD_RIGHT]
  
  // Handle navigation
  if (canNavigate) {
    if (moveLeft || dpadLeft) {
      emit('navigate', { direction: 'left' })
      lastNavigationTime = now
    } else if (moveRight || dpadRight) {
      emit('navigate', { direction: 'right' })
      lastNavigationTime = now
    } else if (moveUp || dpadUp) {
      emit('navigate', { direction: 'up' })
      lastNavigationTime = now
    } else if (moveDown || dpadDown) {
      emit('navigate', { direction: 'down' })
      lastNavigationTime = now
    }
  }
  
  // Face buttons (detect press, not hold)
  const aPressed = gamepad.buttons[GAMEPAD_BUTTONS.A]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.A]
  const bPressed = gamepad.buttons[GAMEPAD_BUTTONS.B]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.B]
  const xPressed = gamepad.buttons[GAMEPAD_BUTTONS.X]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.X]
  const yPressed = gamepad.buttons[GAMEPAD_BUTTONS.Y]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.Y]
  
  // Shoulder buttons
  const lbPressed = gamepad.buttons[GAMEPAD_BUTTONS.LB]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.LB]
  const rbPressed = gamepad.buttons[GAMEPAD_BUTTONS.RB]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.RB]
  const ltPressed = gamepad.buttons[GAMEPAD_BUTTONS.LT]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.LT]
  const rtPressed = gamepad.buttons[GAMEPAD_BUTTONS.RT]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.RT]
  
  // Center buttons
  const startPressed = gamepad.buttons[GAMEPAD_BUTTONS.START]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.START]
  const selectPressed = gamepad.buttons[GAMEPAD_BUTTONS.SELECT]?.pressed && !previousButtonStates[GAMEPAD_BUTTONS.SELECT]
  
  // Emit button events
  if (aPressed) {
    emit('confirm')
  }
  
  if (bPressed) {
    emit('back')
    // Default behavior: go back in router
    if (!eventHandlers.get('back')?.size) {
      router.back()
    }
  }
  
  if (xPressed) {
    emit('options')
  }
  
  if (yPressed) {
    emit('info')
  }
  
  if (lbPressed) emit('lb')
  if (rbPressed) emit('rb')
  if (ltPressed) emit('lt')
  if (rtPressed) emit('rt')
  if (startPressed) emit('start')
  if (selectPressed) emit('select')
  
  // Store previous states
  previousAxes = [...gamepad.axes]
  previousButtonStates = gamepad.buttons.map(b => b.pressed)
  } catch (e) {
    // Ignore errors in test environment
  }
}

function startGlobalListener(router: ReturnType<typeof useRouter>) {
  if (isGlobalListenerRegistered) return
  if (!isGamepadApiAvailable()) return
  
  isGlobalListenerRegistered = true
  
  try {
    // Initial detection
    updateGamepadState()
    
    // Event listeners
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad.id)
      updateGamepadState()
    })
    
    window.addEventListener('gamepaddisconnected', () => {
      console.log('🎮 Gamepad disconnected')
      updateGamepadState()
    })
    
    // Polling loop at ~60fps
    gamepadPollInterval = setInterval(() => {
      processGamepadInput(router)
    }, 16)
  } catch (e) {
    console.warn('Failed to setup gamepad listener:', e)
    isGlobalListenerRegistered = false
  }
}

function stopGlobalListener() {
  if (gamepadPollInterval) {
    clearInterval(gamepadPollInterval)
    gamepadPollInterval = null
  }
  isGlobalListenerRegistered = false
}

export function useGamepad() {
  const router = useRouter()
  
  // Local event handler references for cleanup
  const localHandlers: Array<{ event: GamepadEventType; handler: (data?: any) => void }> = []
  
  function on(event: GamepadEventType, handler: (data?: any) => void) {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set())
    }
    eventHandlers.get(event)!.add(handler)
    localHandlers.push({ event, handler })
  }
  
  function off(event: GamepadEventType, handler: (data?: any) => void) {
    eventHandlers.get(event)?.delete(handler)
  }
  
  onMounted(() => {
    startGlobalListener(router)
  })
  
  onUnmounted(() => {
    // Remove only local handlers
    localHandlers.forEach(({ event, handler }) => {
      off(event, handler)
    })
  })
  
  return {
    state: readonly(globalState),
    on,
    off,
    BUTTONS: GAMEPAD_BUTTONS,
    AXES: GAMEPAD_AXES
  }
}

// Export button mapping utilities
export const buttonIcons: Record<ControllerType, Record<string, string>> = {
  keyboard: { 
    A: 'A', B: 'B', X: 'X', Y: 'Y', 
    LB: 'Q', RB: 'E', LT: 'Z', RT: 'C',
    START: 'ESC', SELECT: 'TAB',
    UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→'
  },
  ps: { 
    A: '✕', B: '○', X: '□', Y: '△', 
    LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2',
    START: 'OPTIONS', SELECT: 'SHARE',
    UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→'
  },
  xbox: { 
    A: 'A', B: 'B', X: 'X', Y: 'Y', 
    LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT',
    START: '☰', SELECT: '⧉',
    UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→'
  }
}

export function getButtonIcon(type: ControllerType, button: string): string {
  return buttonIcons[type]?.[button] || button
}
