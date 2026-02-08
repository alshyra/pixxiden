/**
 * System-related API functions
 */
import { invoke } from "./core";

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
  try {
    const info = await invoke<SystemInfo>("get_system_info");
    return info;
  } catch (error) {
    console.error("Failed to get system info:", error);
    throw error;
  }
}

export async function getDiskInfo(): Promise<DiskInfo[]> {
  try {
    const disks = await invoke<DiskInfo[]>("get_disk_info");
    return disks;
  } catch (error) {
    console.error("Failed to get disk info:", error);
    throw error;
  }
}

export async function checkForUpdates(): Promise<boolean> {
  try {
    const hasUpdate = await invoke<boolean>("check_for_updates");
    return hasUpdate;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    throw error;
  }
}

export async function shutdownSystem(): Promise<void> {
  try {
    await invoke("shutdown_system");
  } catch (error) {
    console.error("Failed to shutdown system:", error);
    throw error;
  }
}

export async function getSettings(): Promise<SettingsConfig> {
  try {
    const settings = await invoke<SettingsConfig>("get_settings");
    return settings;
  } catch (error) {
    console.error("Failed to get settings:", error);
    throw error;
  }
}

export async function saveSettings(config: SettingsConfig): Promise<void> {
  try {
    await invoke("save_settings", { config });
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}
