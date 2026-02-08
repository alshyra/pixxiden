/**
 * System Updates API functions
 */
import { invoke } from "./core";

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
  try {
    return await invoke<Distro>("get_distro");
  } catch (error) {
    console.error("Failed to get distro:", error);
    throw error;
  }
}

export async function isSudoersConfigured(): Promise<SudoersStatus> {
  try {
    return await invoke<SudoersStatus>("is_sudoers_configured");
  } catch (error) {
    console.error("Failed to check sudoers status:", error);
    throw error;
  }
}

export async function configureSudoers(password: string): Promise<void> {
  try {
    await invoke("configure_sudoers", { password });
  } catch (error) {
    console.error("Failed to configure sudoers:", error);
    throw error;
  }
}

export async function checkSystemUpdates(): Promise<UpdateCheckResult> {
  try {
    return await invoke<UpdateCheckResult>("check_system_updates");
  } catch (error) {
    console.error("Failed to check system updates:", error);
    throw error;
  }
}

export async function installSystemUpdates(): Promise<UpdateReport> {
  try {
    return await invoke<UpdateReport>("install_system_updates");
  } catch (error) {
    console.error("Failed to install system updates:", error);
    throw error;
  }
}

export async function requiresSystemReboot(): Promise<boolean> {
  try {
    return await invoke<boolean>("requires_system_reboot");
  } catch (error) {
    console.error("Failed to check reboot status:", error);
    throw error;
  }
}

export async function rebootSystem(): Promise<void> {
  try {
    await invoke("reboot_system");
  } catch (error) {
    console.error("Failed to reboot system:", error);
    throw error;
  }
}
