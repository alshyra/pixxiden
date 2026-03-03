import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGamepad, type ControllerType } from "./useGamepad";
import { useCurrentGame } from "./useCurrentGame";

export type { ControllerType };

export interface FooterButton {
  key: "A" | "B" | "S" | "X" | "Y" | "LB" | "RB";
  label: string;
  action: string;
}

const footerButtonIcons: Record<ControllerType, Record<string, string>> = {
  keyboard: { A: "A", B: "B", S: "S", X: "X", Y: "Y", LB: "Q", RB: "E" },
  ps: { A: "✕", B: "○", S: "SHARE", X: "□", Y: "△", LB: "L1", RB: "R1" },
  xbox: { A: "A", B: "B", S: "BACK", X: "X", Y: "Y", LB: "LB", RB: "RB" },
};

export function useFooterControls() {
  const route = useRoute();
  const { state: gamepadState } = useGamepad();
  const { game } = useCurrentGame();

  // Reactive controller type from gamepad state
  const controllerType = computed<ControllerType>(() => gamepadState.value.type);
  const isConnected = computed(() => gamepadState.value.connected);

  // Dynamic buttons based on current route
  const buttons = computed<FooterButton[]>(() => {
    const routeName = typeof route.name === "string" ? route.name : "";

    switch (routeName) {
      case "library":
        return [
          { key: "LB", label: "Filtre ←", action: "prev-filter" },
          { key: "RB", label: "Filtre →", action: "next-filter" },
          { key: "A", label: "Sélectionner", action: "select" },
          { key: "X", label: "Options", action: "options" },
        ];

      case "game-detail": {
        const actionLabel = game.value?.installation.installed ? "Lancer" : "Installer";

        return [
          { key: "A", label: actionLabel, action: "play" },
          { key: "B", label: "Retour", action: "back" },
          { key: "X", label: "Options", action: "options" },
        ];
      }

      case "downloads":
        return [
          { key: "B", label: "Retour", action: "back" },
        ];

      case "system":
      case "accounts":
        return [
          { key: "B", label: "Retour", action: "back" },
        ];

      default:
        return [
          { key: "A", label: "Confirmer", action: "confirm" },
          { key: "B", label: "Retour", action: "back" },
        ];
    }
  });

  // Get the display icon for a button based on controller type
  function getButtonIcon(key: string): string {
    const icons = footerButtonIcons[controllerType.value];
    return icons[key] || key;
  }

  // Get CSS class for button styling based on controller type
  function getButtonClass(key: string): string {
    const baseClass = "controller-btn";

    if (controllerType.value === "ps") {
      switch (key) {
        case "A":
          return `${baseClass} btn-ps-cross`;
        case "B":
          return `${baseClass} btn-ps-circle`;
        case "S":
          return `${baseClass} btn-ps-select`;
        case "X":
          return `${baseClass} btn-ps-square`;
        case "Y":
          return `${baseClass} btn-ps-triangle`;
        case "LB":
          return `${baseClass} btn-ps-l1`;
        case "RB":
          return `${baseClass} btn-ps-r1`;
        default:
          return baseClass;
      }
    }

    if (controllerType.value === "xbox") {
      switch (key) {
        case "A":
          return `${baseClass} btn-xbox-a`;
        case "B":
          return `${baseClass} btn-xbox-b`;
        case "S":
          return `${baseClass} btn-xbox-back`;
        case "X":
          return `${baseClass} btn-xbox-x`;
        case "Y":
          return `${baseClass} btn-xbox-y`;
        case "LB":
          return `${baseClass} btn-xbox-lb`;
        case "RB":
          return `${baseClass} btn-xbox-rb`;
        default:
          return baseClass;
      }
    }

    return `${baseClass} btn-keyboard`;
  }

  return {
    buttons,
    controllerType,
    isConnected,
    getButtonIcon,
    getButtonClass,
  };
}
