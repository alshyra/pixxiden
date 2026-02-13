/**
 * Pixxiden API - Re-exports all API modules
 *
 * This file maintains backward compatibility with the old monolithic api.ts
 */

// System API
export {
  getSystemInfo,
  getDiskInfo,
  checkForUpdates,
  shutdownSystem,
  getSettings,
  saveSettings,
} from "./system";
export type { SystemInfo, DiskInfo, SettingsConfig } from "./system";

// API Keys
export { needsSetup, getApiKeys, saveApiKeys, skipSetup, testApiKeys } from "./apiKeys";
export type { ApiKeysConfig, ApiKeysUpdateRequest, ApiKeyTestResult } from "./apiKeys";

// System Updates
export {
  getDistro,
  isSudoersConfigured,
  configureSudoers,
  checkSystemUpdates,
  installSystemUpdates,
  requiresSystemReboot,
  rebootSystem,
} from "./updates";
export type {
  Distro,
  PackageCategory,
  UpdatePackage,
  UpdateCheckResult,
  UpdateReport,
  SudoersStatus,
  UpdateProgressEvent,
} from "./updates";
