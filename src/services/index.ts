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
 */

// ============================================================================
// Base Services (bas niveau)
// ============================================================================
import { DatabaseService, SidecarService } from "./base";
export { DatabaseService, SidecarService, SCHEMA, MIGRATIONS } from "./base";

// ============================================================================
// Store Services (un par plateforme)
// ============================================================================
import { LegendaryService, GogdlService, NileService } from "./stores";
export {
  GameStoreService,
  LegendaryService,
  GogdlService,
  NileService,
  SteamService,
} from "./stores";

// ============================================================================
// Auth Services
// ============================================================================
import { AuthService, WebviewAuthHandler } from "./auth";
export { AuthService, WebviewAuthHandler } from "./auth";

// ============================================================================
// Enrichment Services
// ============================================================================
import { EnrichmentService } from "./enrichment";
export {
  EnrichmentService,
  IgdbEnricher,
  HltbEnricher,
  ProtonDbEnricher,
  SteamGridDbEnricher,
} from "./enrichment";
export type {
  EnrichmentData,
  IgdbData,
  HltbData,
  ProtonDbData,
  SteamGridDbData,
} from "./enrichment";

// ============================================================================
// Installation Services
// ============================================================================
import { InstallationService } from "./installation";
export { InstallationService } from "./installation";
export type { InstallProgress } from "./installation";

// ============================================================================
// Orchestrator (point d'entrée principal pour la lib)
// ============================================================================
import { GameLibraryOrchestrator } from "./GameLibraryOrchestrator";
export { GameLibraryOrchestrator } from "./GameLibraryOrchestrator";
export type { LibrarySyncResult, StoreStatus } from "./GameLibraryOrchestrator";

// ============================================================================
// Factory / Initialization
// ============================================================================

let initialized = false;

// Cache pour les services instanciés (lazy loading)
let authServiceInstance: AuthService | null = null;
let enrichmentServiceInstance: EnrichmentService | null = null;
let installationServiceInstance: InstallationService | null = null;

/**
 * Initialise tous les services de l'application.
 * Doit être appelé une seule fois au démarrage (main.ts ou App.vue).
 */
export async function initializeServices(): Promise<void> {
  if (initialized) {
    console.warn("[Services] Already initialized");
    return;
  }

  console.log("[Services] Initializing...");

  // 1. Initialiser la base de données (crée les tables si nécessaire)
  const db = DatabaseService.getInstance();
  await db.init();

  // 2. L'orchestrateur est maintenant prêt
  // Les autres services sont créés à la demande

  initialized = true;
  console.log("[Services] Initialization complete");
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
  if (!authServiceInstance) {
    const db = DatabaseService.getInstance();
    const sidecar = SidecarService.getInstance();
    authServiceInstance = new AuthService(
      new LegendaryService(sidecar, db),
      new GogdlService(sidecar, db),
      new NileService(sidecar, db),
      WebviewAuthHandler.getInstance(),
    );
  }
  return authServiceInstance;
}

/**
 * Raccourci pour obtenir le service d'enrichissement.
 * Usage: const enrichment = getEnrichmentService();
 */
export function getEnrichmentService(): EnrichmentService {
  if (!enrichmentServiceInstance) {
    enrichmentServiceInstance = new EnrichmentService(DatabaseService.getInstance());
  }
  return enrichmentServiceInstance;
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
