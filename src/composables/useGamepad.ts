import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { info } from "@tauri-apps/plugin-log";
import {
  useGamepad as useVueUseGamepad,
  useEventBus,
  useRafFn,
  useThrottleFn,
  whenever,
  onKeyStroke,
} from "@vueuse/core";

export type ControllerType = "keyboard" | "ps" | "xbox";

export interface GamepadState {
  connected: boolean;
  type: ControllerType;
  name: string;
}

// Standard button indices (matches Web Gamepad API)
export const GAMEPAD_BUTTONS = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  GUIDE: 16,
} as const;

export const GAMEPAD_AXES = {
  LEFT_X: 0,
  LEFT_Y: 1,
  RIGHT_X: 2,
  RIGHT_Y: 3,
} as const;

// Utiliser useEventBus de VueUse pour la gestion des événements
export type GamepadEventType =
  | "navigate"
  | "confirm"
  | "back"
  | "options"
  | "info"
  | "lb"
  | "rb"
  | "lt"
  | "rt"
  | "start"
  | "select"
  | "guide";

// Event bus global
const gamepadBus = useEventBus<{ type: GamepadEventType; data?: any }>("gamepad");

// Track si quelqu'un écoute l'événement 'back' pour désactiver le comportement par défaut
const hasBackHandler = ref(false);

// Compteur d'instances pour débugger
let instanceCount = 0;

// État global avec computed pour la réactivité
const globalGamepad = ref<Gamepad | null>(null);
const globalState = computed<GamepadState>(() => {
  const gamepad = globalGamepad.value;
  return {
    connected: !!gamepad,
    type: detectControllerType(gamepad),
    name: gamepad?.id || "",
  };
});

function detectControllerType(gamepad: Gamepad | null): ControllerType {
  if (!gamepad) return "keyboard";
  const id = gamepad.id.toLowerCase();

  if (
    id.includes("playstation") ||
    id.includes("dualshock") ||
    id.includes("dualsense") ||
    id.includes("sony") ||
    id.includes("ps4") ||
    id.includes("ps5") ||
    id.includes("054c") ||
    (id.includes("wireless controller") && !id.includes("xbox"))
  ) {
    return "ps";
  }

  if (
    id.includes("xbox") ||
    id.includes("microsoft") ||
    id.includes("xinput") ||
    id.includes("045e")
  ) {
    return "xbox";
  }

  return "xbox";
}

// Utiliser ref pour l'état précédent
const previousButtonStates = ref<boolean[]>([]);
const previousAxes = ref<number[]>([0, 0, 0, 0]);

// Throttle pour la navigation avec useThrottleFn
const emitNavigation = useThrottleFn((direction: string) => {
  gamepadBus.emit({ type: "navigate", data: { direction } });
}, 150);

// ⚠️ IMPORTANT: onKeyStroke doit être au niveau global, pas dans useGamepad()
// Sinon chaque instance de useGamepad() créera des listeners en double !
let keyboardInitialized = false;

function initializeKeyboard(router: ReturnType<typeof useRouter>) {
  if (keyboardInitialized) {
    info("⌨️ [KEYBOARD] Already initialized, skipping");
    return;
  }

  info("⌨️ [KEYBOARD] Initializing keyboard listeners (ONCE)");
  keyboardInitialized = true;

  const throttledNavigate = useThrottleFn((direction: string) => {
    if (globalState.value.connected) {
      info("🎮 [KEYBOARD] Ignoring - gamepad connected");
      return;
    }
    info(`⌨️ [KEYBOARD] Navigate: ${direction}`);
    gamepadBus.emit({ type: "navigate", data: { direction } });
  }, 150);

  // Navigation
  onKeyStroke("ArrowUp", (e) => {
    info("⬆️ [KEY] ArrowUp");
    e.preventDefault();
    throttledNavigate("up");
  });

  onKeyStroke("ArrowDown", (e) => {
    info("⬇️ [KEY] ArrowDown");
    e.preventDefault();
    throttledNavigate("down");
  });

  onKeyStroke("ArrowLeft", (e) => {
    info("⬅️ [KEY] ArrowLeft");
    e.preventDefault();
    throttledNavigate("left");
  });

  onKeyStroke("ArrowRight", (e) => {
    info("➡️ [KEY] ArrowRight");
    e.preventDefault();
    throttledNavigate("right");
  });

  // Autres touches
  onKeyStroke(["Enter", " "], (e) => {
    info("✅ [KEY] Confirm");
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "confirm" });
  });

  onKeyStroke(["Escape", "Backspace"], (e) => {
    info("🔙 [KEY] Back");
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "back" });
    if (!hasBackHandler.value) {
      router.back();
    }
  });

  onKeyStroke("x", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "options" });
  });

  onKeyStroke("i", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "info" });
  });

  onKeyStroke("q", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "lb" });
  });

  onKeyStroke("e", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "rb" });
  });

  onKeyStroke("z", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "lt" });
  });

  onKeyStroke("c", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "rt" });
  });

  onKeyStroke("Tab", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "select" });
  });

  onKeyStroke("m", (e) => {
    e.preventDefault();
    if (globalState.value.connected) return;
    gamepadBus.emit({ type: "start" });
  });
}

function processGamepadInput(gamepad: Gamepad | null, router: ReturnType<typeof useRouter>) {
  if (!gamepad) return;

  try {
    const threshold = 0.5;

    // Gestion du stick gauche
    const leftX = gamepad.axes[GAMEPAD_AXES.LEFT_X] || 0;
    const leftY = gamepad.axes[GAMEPAD_AXES.LEFT_Y] || 0;

    const moveLeft = leftX < -threshold && Math.abs(previousAxes.value[0]) < threshold;
    const moveRight = leftX > threshold && Math.abs(previousAxes.value[0]) < threshold;
    const moveUp = leftY < -threshold && Math.abs(previousAxes.value[1]) < threshold;
    const moveDown = leftY > threshold && Math.abs(previousAxes.value[1]) < threshold;

    // D-pad avec helper pour détecter les pressions
    const isPressed = (btnIdx: number) =>
      gamepad.buttons[btnIdx]?.pressed && !previousButtonStates.value[btnIdx];

    const dpadUp = isPressed(GAMEPAD_BUTTONS.DPAD_UP);
    const dpadDown = isPressed(GAMEPAD_BUTTONS.DPAD_DOWN);
    const dpadLeft = isPressed(GAMEPAD_BUTTONS.DPAD_LEFT);
    const dpadRight = isPressed(GAMEPAD_BUTTONS.DPAD_RIGHT);

    // Navigation (throttled automatiquement)
    if (moveLeft || dpadLeft) emitNavigation("left");
    else if (moveRight || dpadRight) emitNavigation("right");
    else if (moveUp || dpadUp) emitNavigation("up");
    else if (moveDown || dpadDown) emitNavigation("down");

    // Boutons de face
    if (isPressed(GAMEPAD_BUTTONS.A)) gamepadBus.emit({ type: "confirm" });

    if (isPressed(GAMEPAD_BUTTONS.B)) {
      gamepadBus.emit({ type: "back" });
      // Comportement par défaut si personne n'écoute
      if (!hasBackHandler.value) {
        router.back();
      }
    }

    if (isPressed(GAMEPAD_BUTTONS.X)) gamepadBus.emit({ type: "options" });
    if (isPressed(GAMEPAD_BUTTONS.Y)) gamepadBus.emit({ type: "info" });

    // Boutons d'épaule
    if (isPressed(GAMEPAD_BUTTONS.LB)) gamepadBus.emit({ type: "lb" });
    if (isPressed(GAMEPAD_BUTTONS.RB)) gamepadBus.emit({ type: "rb" });
    if (isPressed(GAMEPAD_BUTTONS.LT)) gamepadBus.emit({ type: "lt" });
    if (isPressed(GAMEPAD_BUTTONS.RT)) gamepadBus.emit({ type: "rt" });

    // Boutons centraux
    if (isPressed(GAMEPAD_BUTTONS.START)) gamepadBus.emit({ type: "start" });
    if (isPressed(GAMEPAD_BUTTONS.SELECT)) gamepadBus.emit({ type: "select" });
    if (isPressed(GAMEPAD_BUTTONS.GUIDE)) gamepadBus.emit({ type: "guide" });

    // Mise à jour des états précédents
    previousAxes.value = [...gamepad.axes];
    previousButtonStates.value = gamepad.buttons.map((b) => b.pressed);
  } catch {
    // Ignore errors in test environment
  }
}

export function useGamepad() {
  instanceCount++;
  const currentInstance = instanceCount;
  info(`🎮 [GAMEPAD] Instance #${currentInstance} created (total instances: ${instanceCount})`);

  const router = useRouter();
  const { gamepads } = useVueUseGamepad();

  // Initialiser le clavier une seule fois (globalement)
  initializeKeyboard(router);

  // Watcher pour la connexion/déconnexion
  watch(
    () => gamepads.value?.[0],
    (gamepad) => {
      globalGamepad.value = (gamepad || null) as Gamepad | null;

      if (gamepad) {
        info(`🎮 Gamepad connected: ${gamepad.id}`);
      }
    },
    { immediate: true },
  );

  // useRafFn pour la boucle de traitement des inputs (RequestAnimationFrame)
  const { pause, resume } = useRafFn(() => {
    processGamepadInput(globalGamepad.value, router);
  });

  // Démarrer/arrêter selon la connexion
  whenever(() => globalState.value.connected, resume, { immediate: true });
  whenever(() => !globalState.value.connected, pause);

  // Helper pour écouter des événements spécifiques
  function on(event: GamepadEventType, handler: (data?: any) => void) {
    info(`🎧 [LISTENER] Registering listener for event: ${event}`);

    // Tracker si quelqu'un écoute 'back'
    if (event === "back") {
      hasBackHandler.value = true;
    }

    const unsubscribe = gamepadBus.on((payload) => {
      if (payload.type === event) {
        info(`✅ [EXECUTE] Handler for '${event}'`);
        handler(payload.data);
      }
    });

    // Retourner une fonction de cleanup
    return () => {
      info(`🗑️ [CLEANUP] Unsubscribing from event: ${event}`);
      unsubscribe();
      if (event === "back") {
        hasBackHandler.value = false;
      }
    };
  }

  return {
    state: globalState,
    on,
    BUTTONS: GAMEPAD_BUTTONS,
    AXES: GAMEPAD_AXES,
  };
}
