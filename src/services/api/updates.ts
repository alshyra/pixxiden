/**
 * System Updates API functions
 */
import { invoke, isMockMode } from "./core";

export type Distro = "arch" | "steamos" | "debian" | "fedora" | "unknown";

export type PackageCategory =
  | "system"
  | "graphics"
  | "audio"
  | "gaming"
  | "application"
  | "library";

export interface UpdatePackage {
  name: string;
  currentVersion: string;
  newVersion: string;
  category: PackageCategory;
  size: number;
  critical: boolean;
}

export interface UpdateCheckResult {
  distro: Distro;
  packages: UpdatePackage[];
  totalSize: number;
  requiresReboot: boolean;
}

export interface UpdateReport {
  totalPackages: number;
  installedSuccessfully: number;
  failed: string[];
  requiresReboot: boolean;
  durationSeconds: number;
}

export interface SudoersStatus {
  configured: boolean;
  distro: Distro;
  sudoersFileExists: boolean;
}

export interface UpdateProgressEvent {
  stage: "downloading" | "installing" | "configuring";
  packageName: string;
  progress: number;
  downloaded: string;
  total: string;
  speed: string;
  eta: string;
}

export async function getDistro(): Promise<Distro> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock distro");
    return "arch";
  }

  try {
    return await invoke<Distro>("get_distro");
  } catch (error) {
    console.error("Failed to get distro:", error);
    throw error;
  }
}

export async function isSudoersConfigured(): Promise<SudoersStatus> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock sudoers status");
    return { configured: false, distro: "arch", sudoersFileExists: false };
  }

  try {
    return await invoke<SudoersStatus>("is_sudoers_configured");
  } catch (error) {
    console.error("Failed to check sudoers status:", error);
    throw error;
  }
}

export async function configureSudoers(password: string): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Mock configure sudoers");
    if (password !== "test") {
      throw new Error("Mot de passe incorrect");
    }
    return;
  }

  try {
    await invoke("configure_sudoers", { password });
  } catch (error) {
    console.error("Failed to configure sudoers:", error);
    throw error;
  }
}

export async function checkSystemUpdates(): Promise<UpdateCheckResult> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock system updates");
    return {
      distro: "arch",
      packages: [
        {
          name: "linux",
          currentVersion: "6.6.1",
          newVersion: "6.6.2",
          category: "system",
          size: 150000000,
          critical: true,
        },
        {
          name: "mesa",
          currentVersion: "24.0",
          newVersion: "24.1",
          category: "graphics",
          size: 50000000,
          critical: true,
        },
        {
          name: "pipewire",
          currentVersion: "1.0.1",
          newVersion: "1.0.2",
          category: "audio",
          size: 10000000,
          critical: false,
        },
        {
          name: "steam",
          currentVersion: "1.0.0.78",
          newVersion: "1.0.0.79",
          category: "gaming",
          size: 25000000,
          critical: false,
        },
        {
          name: "firefox",
          currentVersion: "121.0",
          newVersion: "122.0",
          category: "application",
          size: 80000000,
          critical: false,
        },
      ],
      totalSize: 315000000,
      requiresReboot: true,
    };
  }

  try {
    return await invoke<UpdateCheckResult>("check_system_updates");
  } catch (error) {
    console.error("Failed to check system updates:", error);
    throw error;
  }
}

export async function installSystemUpdates(): Promise<UpdateReport> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Mock install system updates");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return {
      totalPackages: 5,
      installedSuccessfully: 5,
      failed: [],
      requiresReboot: true,
      durationSeconds: 45,
    };
  }

  try {
    return await invoke<UpdateReport>("install_system_updates");
  } catch (error) {
    console.error("Failed to install system updates:", error);
    throw error;
  }
}

export async function requiresSystemReboot(): Promise<boolean> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock reboot status");
    return false;
  }

  try {
    return await invoke<boolean>("requires_system_reboot");
  } catch (error) {
    console.error("Failed to check reboot status:", error);
    throw error;
  }
}

export async function rebootSystem(): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Mock reboot system (no-op)");
    return;
  }

  try {
    await invoke("reboot_system");
  } catch (error) {
    console.error("Failed to reboot system:", error);
    throw error;
  }
}
