import { onMounted, onUnmounted, type Ref } from "vue";
import { GAMEPAD_AXES } from "./useGamepad";

/**
 * Enables right-stick scrolling on a scrollable container.
 * Polls the gamepad at ~60fps and scrolls the container based on right stick Y axis.
 *
 * @param containerRef - Ref to the scrollable HTML element
 * @param speed - Scroll speed multiplier (default: 12)
 */
export function useGamepadScroll(containerRef: Ref<HTMLElement | null>, speed = 12) {
  let animationFrame = 0;
  const deadzone = 0.15;

  function pollScroll() {
    try {
      const gamepads = navigator.getGamepads?.();
      const gamepad = gamepads?.[0];
      if (gamepad && containerRef.value) {
        const rightY = gamepad.axes[GAMEPAD_AXES.RIGHT_Y] || 0;
        if (Math.abs(rightY) > deadzone) {
          containerRef.value.scrollTop += rightY * speed;
        }
      }
    } catch {
      // Ignore errors (e.g., in test environment)
    }
    animationFrame = requestAnimationFrame(pollScroll);
  }

  onMounted(() => {
    animationFrame = requestAnimationFrame(pollScroll);
  });

  onUnmounted(() => {
    cancelAnimationFrame(animationFrame);
  });
}
