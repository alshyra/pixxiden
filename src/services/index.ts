/**
 * Services Index - Point d'entrée principal
 *
 * Ce fichier expose tous les services de l'application.
 * Les stores Pinia et composables doivent importer depuis ici.
 *
 * Architecture:
 * - base/        → DatabaseService, SidecarService (bas niveau)
 * - stores/      → LegendaryService, GogdlService, NileService, SteamService
 * - auth/        → AuthService, WebviewAuthHandler
 * - enrichment/  → EnrichmentService
 * - orchestrator → GameLibraryOrchestrator (agrège tout)
 * - lib/database → GameRepository, CacheRepository (pure TS CRUD)
 * - lib/sync     → GameSyncService (sync + enrichment pipeline)
 */

// ============================================================================
// Base Services (bas niveau)
// ============================================================================
import { info, warn } from "@tauri-apps/plugin-log";
import { DatabaseService, SidecarService } from "./base";
export { AuthService, WebviewAuthHandler } from "./auth";
export { DatabaseService, MIGRATIONS, SCHEMA, SidecarService } from "./base";
export {
  EnrichmentService,
  IgdbEnricher,
  ProtonDbEnricher,
  SteamGridDbEnricher,
} from "./enrichment";
export type { EnrichmentData, IgdbData, ProtonDbData, SteamGridDbData } from "./enrichment";
export {
  GameStoreService,
  GogdlService,
  LegendaryService,
  NileService,
  SteamService,
} from "./stores";

// ============================================================================
// Auth Services
// ============================================================================
import { AuthService } from "./auth";

// ============================================================================
// Enrichment Services
// ============================================================================
import { EnrichmentService } from "./enrichment";

// ============================================================================
// Heroic Import (merge installation data from Heroic launcher)
// ============================================================================
export { GameLibraryOrchestrator } from "./GameLibraryOrchestrator";
export type { StoreStatus, SyncOptions, SyncResult } from "./GameLibraryOrchestrator";
export { HeroicImportService } from "./heroic";
export type { HeroicInstallInfo } from "./heroic";
export { InstallationService } from "./installation";
export type { GameSizeInfo, InstallProgress } from "./installation";
export { GameLaunchService } from "./launch";
export { LaunchCommandBuilder } from "./launch";
export type { PreparedLaunch, LaunchStrategy, LaunchContext } from "./launch";
export { ProtonService } from "./runners";
export type { ProtonConfig } from "./runners";
export { WindowService } from "./window";

// ============================================================================
// Installation Services
// ============================================================================
import { InstallationService } from "./installation";

// ============================================================================
// Runners (Proton-GE)
// ============================================================================
import { ProtonService } from "./runners";

// ============================================================================
// Launch Service (game process management)
// ============================================================================
import { GameLaunchService } from "./launch";

// ============================================================================
// Window Service (main window focus/hide/restore)
// ============================================================================
import { WindowService } from "./window";

// ============================================================================
// Orchestrator (point d'entrée principal pour la lib)
// ============================================================================
import { GameLibraryOrchestrator } from "./GameLibraryOrchestrator";

// ============================================================================
// New: Database Repositories (pure TypeScript CRUD)
// ============================================================================
export { CacheRepository, GameRepository } from "@/lib/database";

// ============================================================================
// New: Sync Service (JS-first sync pipeline)
// ============================================================================
export { GameSyncService } from "@/lib/sync";
export type { SyncError, SyncProgressEvent } from "@/lib/sync";

// ============================================================================
// Factory / Initialization
// ============================================================================

let initialized = false;

// Cache pour les services instanciés (lazy loading)
let installationServiceInstance: InstallationService | null = null;

/**
 * Initialise tous les services de l'application.
 * Doit être appelé une seule fois au démarrage (SplashScreen).
 */
export async function initializeServices(): Promise<void> {
  if (initialized) {
    await warn("[Services] Already initialized");
    return;
  }

  await info("[Services] Initializing...");

  // 1. Initialiser la base de données (crée les tables si nécessaire)
  const db = DatabaseService.getInstance();
  await db.init();

  // 2. L'orchestrateur et GameSyncService sont maintenant prêts
  // Les autres services sont créés à la demande

  initialized = true;
  await info("[Services] Initialization complete");

  // Background: Ensure Proton-GE is installed (non-blocking)
  ProtonService.getInstance()
    .ensureProtonInstalled()
    .catch(async (err) => {
      await warn(`[Services] Proton-GE auto-install failed: ${err}`);
    });
}

/**
 * Raccourci pour obtenir l'orchestrateur principal.
 * Usage: const orchestrator = getOrchestrator();
 */
export function getOrchestrator(): GameLibraryOrchestrator {
  return GameLibraryOrchestrator.getInstance();
}

/**
 * Raccourci pour obtenir le service d'authentification.
 * Usage: const auth = getAuthService();
 */
export function getAuthService(): AuthService {
  return AuthService.getInstance();
}

/**
 * Raccourci pour obtenir le service d'enrichissement.
 * Usage: const enrichment = getEnrichmentService();
 */
export function getEnrichmentService(): EnrichmentService {
  return EnrichmentService.getInstance();
}

/**
 * Raccourci pour obtenir le service de base de données.
 * Usage: const db = getDatabaseService();
 */
export function getDatabaseService(): DatabaseService {
  return DatabaseService.getInstance();
}

/**
 * Raccourci pour obtenir le service d'installation.
 * Usage: const installation = getInstallationService();
 */
export function getInstallationService(): InstallationService {
  if (!installationServiceInstance) {
    const db = DatabaseService.getInstance();
    const sidecar = SidecarService.getInstance();
    installationServiceInstance = new InstallationService(sidecar, db);
  }
  return installationServiceInstance;
}

/**
 * Raccourci pour obtenir le service de lancement.
 * Usage: const launch = getGameLaunchService();
 */
export function getGameLaunchService(): GameLaunchService {
  return GameLaunchService.getInstance();
}

/**
 * Raccourci pour obtenir le service Proton-GE.
 * Usage: const proton = getProtonService();
 */
export function getProtonService(): ProtonService {
  return ProtonService.getInstance();
}

/**
 * Raccourci pour obtenir le service de gestion de fenêtre.
 * Usage: const window = getWindowService();
 */
export function getWindowService(): WindowService {
  return WindowService.getInstance();
}
