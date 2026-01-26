import { ref, onMounted, onUnmounted, computed } from "vue";

export interface FocusableElement {
  id: string;
  element: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocusNavigationOptions {
  gridColumns?: number;
  wrapNavigation?: boolean;
  autoScroll?: boolean;
  scrollBehavior?: ScrollBehavior;
  initialIndex?: number;
}

const defaultOptions: FocusNavigationOptions = {
  gridColumns: 5,
  wrapNavigation: false,
  autoScroll: true,
  scrollBehavior: "smooth",
  initialIndex: 0,
};

export function useFocusNavigation(gridSelector: string, options: FocusNavigationOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  const focusedIndex = ref(opts.initialIndex || 0);
  const focusables = ref<FocusableElement[]>([]);
  const gridColumns = ref(opts.gridColumns || 5);

  // Gamepad state to prevent rapid-fire navigation
  let lastNavigationTime = 0;
  const navigationThreshold = 150; // ms between navigations
  let gamepadPollInterval: ReturnType<typeof setInterval> | null = null;
  let previousAxes: number[] = [0, 0, 0, 0];
  let buttonStates: boolean[] = [];

  // Calculate focusable elements from the DOM
  function updateFocusables() {
    const elements = document.querySelectorAll(gridSelector);
    focusables.value = Array.from(elements).map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-id") || `item-${index}`,
        element: el as HTMLElement,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
  }

  // Get the currently focused element
  const focusedElement = computed(() => {
    return focusables.value[focusedIndex.value] || null;
  });

  // Get the ID of the focused element
  const focusedId = computed(() => {
    return focusedElement.value?.id || null;
  });

  // Navigate in a direction
  function navigate(direction: "up" | "down" | "left" | "right") {
    const current = focusedIndex.value;
    const total = focusables.value.length;
    const cols = gridColumns.value;

    if (total === 0) return;

    let next = current;

    switch (direction) {
      case "left":
        if (current % cols > 0) {
          next = current - 1;
        } else if (opts.wrapNavigation && current > 0) {
          next = current - 1;
        }
        break;

      case "right":
        if ((current + 1) % cols !== 0 && current < total - 1) {
          next = current + 1;
        } else if (opts.wrapNavigation && current < total - 1) {
          next = current + 1;
        }
        break;

      case "up":
        if (current >= cols) {
          next = current - cols;
        } else if (opts.wrapNavigation) {
          // Wrap to last row, same column
          const lastRowStart = Math.floor((total - 1) / cols) * cols;
          const targetInLastRow = lastRowStart + (current % cols);
          next = Math.min(targetInLastRow, total - 1);
        }
        break;

      case "down":
        if (current + cols < total) {
          next = current + cols;
        } else if (opts.wrapNavigation) {
          // Wrap to first row, same column
          next = current % cols;
        }
        break;
    }

    if (next !== current && next >= 0 && next < total) {
      focusedIndex.value = next;

      if (opts.autoScroll) {
        scrollToFocused();
      }

      playFocusSound();
    }
  }

  // Scroll the focused element into view
  function scrollToFocused() {
    const focused = focusables.value[focusedIndex.value];
    if (focused?.element) {
      focused.element.scrollIntoView({
        behavior: opts.scrollBehavior,
        block: "center",
        inline: "center",
      });
    }
  }

  // Focus a specific index
  function focusIndex(index: number) {
    if (index >= 0 && index < focusables.value.length) {
      focusedIndex.value = index;
      if (opts.autoScroll) {
        scrollToFocused();
      }
    }
  }

  // Focus by ID
  function focusById(id: string) {
    const index = focusables.value.findIndex((f: FocusableElement) => f.id === id);
    if (index !== -1) {
      focusIndex(index);
    }
  }

  // Select/click the currently focused element
  function select() {
    const focused = focusables.value[focusedIndex.value];
    if (focused?.element) {
      focused.element.click();
      playSelectSound();
    }
  }

  // Play navigation sound (optional)
  function playFocusSound() {
    // Can be implemented with Web Audio API if desired
  }

  // Play select sound (optional)
  function playSelectSound() {
    // Can be implemented with Web Audio API if desired
  }

  // Keyboard handler
  function handleKeyDown(e: KeyboardEvent) {
    const keyMap: Record<string, "up" | "down" | "left" | "right"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };

    const direction = keyMap[e.key];

    if (direction) {
      e.preventDefault();
      navigate(direction);
      return;
    }

    // Enter or Space to select
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select();
    }
  }

  // Gamepad handler with threshold to prevent rapid-fire
  function handleGamepadInput() {
    const now = Date.now();
    if (now - lastNavigationTime < navigationThreshold) {
      return;
    }

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];

    if (!gamepad) return;

    const threshold = 0.5;

    // Left stick / D-pad axes
    const leftX = gamepad.axes[0] || 0;
    const leftY = gamepad.axes[1] || 0;

    // Check for axis movement beyond deadzone
    const moveLeft = leftX < -threshold && Math.abs(previousAxes[0]) < threshold;
    const moveRight = leftX > threshold && Math.abs(previousAxes[0]) < threshold;
    const moveUp = leftY < -threshold && Math.abs(previousAxes[1]) < threshold;
    const moveDown = leftY > threshold && Math.abs(previousAxes[1]) < threshold;

    if (moveLeft) {
      navigate("left");
      lastNavigationTime = now;
    } else if (moveRight) {
      navigate("right");
      lastNavigationTime = now;
    } else if (moveUp) {
      navigate("up");
      lastNavigationTime = now;
    } else if (moveDown) {
      navigate("down");
      lastNavigationTime = now;
    }

    // D-pad buttons (indices vary by controller, these are common)
    // Up: 12, Down: 13, Left: 14, Right: 15
    const dpadUp = gamepad.buttons[12]?.pressed;
    const dpadDown = gamepad.buttons[13]?.pressed;
    const dpadLeft = gamepad.buttons[14]?.pressed;
    const dpadRight = gamepad.buttons[15]?.pressed;

    if (dpadUp && !buttonStates[12]) {
      navigate("up");
      lastNavigationTime = now;
    }
    if (dpadDown && !buttonStates[13]) {
      navigate("down");
      lastNavigationTime = now;
    }
    if (dpadLeft && !buttonStates[14]) {
      navigate("left");
      lastNavigationTime = now;
    }
    if (dpadRight && !buttonStates[15]) {
      navigate("right");
      lastNavigationTime = now;
    }

    // A/X button to select (button 0 on most controllers)
    const aButton = gamepad.buttons[0]?.pressed;
    if (aButton && !buttonStates[0]) {
      select();
      lastNavigationTime = now;
    }

    // Store previous states
    previousAxes = [...gamepad.axes];
    buttonStates = gamepad.buttons.map((b) => b.pressed);
  }

  // Update grid columns dynamically
  function setGridColumns(cols: number) {
    gridColumns.value = cols;
  }

  // Lifecycle
  onMounted(() => {
    // Initial scan
    updateFocusables();

    // Add keyboard listener
    window.addEventListener("keydown", handleKeyDown);

    // Start gamepad polling at ~60fps
    gamepadPollInterval = setInterval(handleGamepadInput, 16);

    // Observe DOM changes to update focusables
    const observer = new MutationObserver(() => {
      updateFocusables();
    });

    // Find the parent container and observe it
    const container = document.querySelector(gridSelector)?.parentElement;
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);

    if (gamepadPollInterval) {
      clearInterval(gamepadPollInterval);
    }
  });

  return {
    focusedIndex,
    focusedId,
    focusedElement,
    focusables,
    gridColumns,
    navigate,
    select,
    focusIndex,
    focusById,
    updateFocusables,
    setGridColumns,
    scrollToFocused,
  };
}
