/**
 * GamepadSimulator — Keyboard bridge to simulate gamepad inputs in E2E tests
 *
 * Maps physical gamepad buttons to their keyboard equivalents as defined in
 * src/composables/useGamepad.ts (initializeKeyboard).
 *
 * Mapping reference:
 *   A / Cross    → Enter / Space
 *   B / Circle   → Escape / Backspace
 *   LB / L1      → Q
 *   RB / R1      → E
 *   D-Pad        → Arrow keys
 *   Options / X  → X
 *   SideNav Menu → S
 */
export class GamepadSimulator {
  /** A button / Cross — confirm, select, open */
  async confirm(pause = 300): Promise<void> {
    await browser.keys("Enter");
    await browser.pause(pause);
  }

  /** B button / Circle — go back, cancel, close */
  async back(pause = 300): Promise<void> {
    await browser.keys("Escape");
    await browser.pause(pause);
  }

  /** S key — open the SideNav overlay (global handler in App.vue) */
  async menu(pause = 600): Promise<void> {
    await browser.keys("s");
    await browser.pause(pause);
  }

  /** D-pad navigation — supports repeated presses */
  async navigate(
    dir: "up" | "down" | "left" | "right",
    repeat = 1,
    pause = 150,
  ): Promise<void> {
    const keyMap: Record<string, string> = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    };
    for (let i = 0; i < repeat; i++) {
      await browser.keys(keyMap[dir]);
      await browser.pause(pause);
    }
  }

  /** LB / L1 — cycle previous (filters, tabs) */
  async lb(pause = 250): Promise<void> {
    await browser.keys("q");
    await browser.pause(pause);
  }

  /** RB / R1 — cycle next (filters, tabs) */
  async rb(pause = 250): Promise<void> {
    await browser.keys("e");
    await browser.pause(pause);
  }

  /** Options / X button */
  async options(pause = 300): Promise<void> {
    await browser.keys("x");
    await browser.pause(pause);
  }
}

/** Shared singleton — use this in page objects and scenarios */
export const gamepad = new GamepadSimulator();
