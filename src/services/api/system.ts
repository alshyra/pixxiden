/**
 * System-related API functions
 */
import { invoke, isMockMode } from "./core";

export interface SystemInfo {
  osName: string;
  osVersion: string;
  kernelVersion: string;
  cpuBrand: string;
  totalMemory: number;
  hostname: string;
}

export interface DiskInfo {
  name: string;
  mountPoint: string;
  totalSpace: number;
  availableSpace: number;
  usedSpace: number;
  fileSystem: string;
  isRemovable: boolean;
}

export interface SettingsConfig {
  protonVersion: string;
  mangoHudEnabled: boolean;
  defaultInstallPath: string;
  winePrefixPath: string;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock system info");
    return {
      osName: "Linux",
      osVersion: "Fedora 39",
      kernelVersion: "6.6.0-test",
      cpuBrand: "Intel Core i7-9700K @ 3.60GHz",
      totalMemory: 17179869184,
      hostname: "pixxiden-test",
    };
  }

  try {
    const info = await invoke<SystemInfo>("get_system_info");
    return info;
  } catch (error) {
    console.error("Failed to get system info:", error);
    throw error;
  }
}

export async function getDiskInfo(): Promise<DiskInfo[]> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock disk info");
    return [
      {
        name: "nvme0n1p3",
        mountPoint: "/",
        totalSpace: 500000000000,
        availableSpace: 250000000000,
        usedSpace: 250000000000,
        fileSystem: "ext4",
        isRemovable: false,
      },
      {
        name: "sda1",
        mountPoint: "/home",
        totalSpace: 1000000000000,
        availableSpace: 600000000000,
        usedSpace: 400000000000,
        fileSystem: "ext4",
        isRemovable: false,
      },
    ];
  }

  try {
    const disks = await invoke<DiskInfo[]>("get_disk_info");
    return disks;
  } catch (error) {
    console.error("Failed to get disk info:", error);
    throw error;
  }
}

export async function checkForUpdates(): Promise<boolean> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock update check (no updates)");
    return false;
  }

  try {
    const hasUpdate = await invoke<boolean>("check_for_updates");
    return hasUpdate;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    throw error;
  }
}

export async function shutdownSystem(): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Mock shutdown (no-op)");
    return;
  }

  try {
    await invoke("shutdown_system");
  } catch (error) {
    console.error("Failed to shutdown system:", error);
    throw error;
  }
}

export async function getSettings(): Promise<SettingsConfig> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock settings");
    return {
      protonVersion: "ge-proton-8-32",
      mangoHudEnabled: false,
      defaultInstallPath: "~/Games",
      winePrefixPath: "~/.local/share/pixxiden/prefixes",
    };
  }

  try {
    const settings = await invoke<SettingsConfig>("get_settings");
    return settings;
  } catch (error) {
    console.error("Failed to get settings:", error);
    throw error;
  }
}

export async function saveSettings(config: SettingsConfig): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Mock save settings:", config);
    return;
  }

  try {
    await invoke("save_settings", { config });
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}
