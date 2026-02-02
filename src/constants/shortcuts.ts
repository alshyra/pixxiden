/**
 * Keyboard and Gamepad shortcut definitions
 *
 * Input hierarchy:
 * 1. Mouse (Primary - always works)
 * 2. Keyboard (Secondary)
 * 3. Gamepad (Tertiary, exceptions noted)
 *
 * Exception: Auth webviews use keyboard+mouse only
 */

export const KEYBOARD_SHORTCUTS = {
  BACK: "Escape",
  CONFIRM: "Enter",
  ALTERNATE_CONFIRM: " ",
  NAVIGATE_UP: "ArrowUp",
  NAVIGATE_DOWN: "ArrowDown",
  NAVIGATE_LEFT: "ArrowLeft",
  NAVIGATE_RIGHT: "ArrowRight",
} as const;

export const GAMEPAD_BUTTONS = {
  BACK: "back",
  CONFIRM: "confirm",
} as const;

export type KeyboardShortcut = (typeof KEYBOARD_SHORTCUTS)[keyof typeof KEYBOARD_SHORTCUTS];
export type GamepadButton = (typeof GAMEPAD_BUTTONS)[keyof typeof GAMEPAD_BUTTONS];
