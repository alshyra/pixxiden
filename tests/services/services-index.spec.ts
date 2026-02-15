import { beforeEach, describe, expect, it, vi } from "vitest";

describe("services index", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("initializes services once and logs repeated initialization", async () => {
    const info = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn().mockResolvedValue(undefined);
    const dbInit = vi.fn().mockResolvedValue(undefined);
    const ensureProtonInstalled = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@tauri-apps/plugin-log", () => ({ info, warn }));
    vi.doMock("@/services/base", () => ({
      DatabaseService: { getInstance: vi.fn(() => ({ init: dbInit })) },
      SidecarService: { getInstance: vi.fn(() => ({ sidecar: true })) },
      MIGRATIONS: [],
      SCHEMA: "",
    }));
    vi.doMock("@/services/runners", () => ({
      ProtonService: { getInstance: vi.fn(() => ({ ensureProtonInstalled })) },
    }));
    vi.doMock("@/services/stores", () => ({
      GameStoreService: class {},
      LegendaryService: { getInstance: vi.fn() },
      GogdlService: { getInstance: vi.fn() },
      NileService: { getInstance: vi.fn() },
      SteamService: { getInstance: vi.fn() },
    }));
    vi.doMock("@/services/auth", () => ({
      AuthService: { getInstance: vi.fn() },
      WebviewAuthHandler: class {},
    }));
    vi.doMock("@/services/enrichment", () => ({
      EnrichmentService: { getInstance: vi.fn() },
      IgdbEnricher: class {},
      ProtonDbEnricher: class {},
      SteamGridDbEnricher: class {},
    }));
    vi.doMock("@/services/installation", () => ({
      InstallationService: class {},
    }));
    vi.doMock("@/services/launch", () => ({
      GameLaunchService: { getInstance: vi.fn() },
      LaunchCommandBuilder: class {},
    }));
    vi.doMock("@/services/window", () => ({
      WindowService: { getInstance: vi.fn() },
    }));
    vi.doMock("@/services/GameLibraryOrchestrator", () => ({
      GameLibraryOrchestrator: { getInstance: vi.fn() },
    }));
    vi.doMock("@/services/heroic", () => ({
      HeroicImportService: class {},
    }));
    vi.doMock("@/lib/database", () => ({
      GameRepository: { getInstance: vi.fn() },
      CacheRepository: { getInstance: vi.fn() },
    }));
    vi.doMock("@/lib/sync", () => ({
      GameSyncService: { getInstance: vi.fn() },
    }));

    const { initializeServices } = await import("@/services");

    await initializeServices();
    await initializeServices();

    expect(dbInit).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith("[Services] Initializing...");
    expect(info).toHaveBeenCalledWith("[Services] Initialization complete");
    expect(ensureProtonInstalled).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[Services] Already initialized");
  });

  it("logs proton auto-install errors", async () => {
    const info = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn().mockResolvedValue(undefined);
    const dbInit = vi.fn().mockResolvedValue(undefined);
    const ensureProtonInstalled = vi.fn().mockRejectedValue("boom");

    vi.doMock("@tauri-apps/plugin-log", () => ({ info, warn }));
    vi.doMock("@/services/base", () => ({
      DatabaseService: { getInstance: vi.fn(() => ({ init: dbInit })) },
      SidecarService: { getInstance: vi.fn(() => ({ sidecar: true })) },
      MIGRATIONS: [],
      SCHEMA: "",
    }));
    vi.doMock("@/services/runners", () => ({
      ProtonService: { getInstance: vi.fn(() => ({ ensureProtonInstalled })) },
    }));
    vi.doMock("@/services/stores", () => ({
      GameStoreService: class {},
      LegendaryService: { getInstance: vi.fn() },
      GogdlService: { getInstance: vi.fn() },
      NileService: { getInstance: vi.fn() },
      SteamService: { getInstance: vi.fn() },
    }));
    vi.doMock("@/services/auth", () => ({
      AuthService: { getInstance: vi.fn() },
      WebviewAuthHandler: class {},
    }));
    vi.doMock("@/services/enrichment", () => ({
      EnrichmentService: { getInstance: vi.fn() },
      IgdbEnricher: class {},
      ProtonDbEnricher: class {},
      SteamGridDbEnricher: class {},
    }));
    vi.doMock("@/services/installation", () => ({
      InstallationService: class {},
    }));
    vi.doMock("@/services/launch", () => ({
      GameLaunchService: { getInstance: vi.fn() },
      LaunchCommandBuilder: class {},
    }));
    vi.doMock("@/services/window", () => ({
      WindowService: { getInstance: vi.fn() },
    }));
    vi.doMock("@/services/GameLibraryOrchestrator", () => ({
      GameLibraryOrchestrator: { getInstance: vi.fn() },
    }));
    vi.doMock("@/services/heroic", () => ({
      HeroicImportService: class {},
    }));
    vi.doMock("@/lib/database", () => ({
      GameRepository: { getInstance: vi.fn() },
      CacheRepository: { getInstance: vi.fn() },
    }));
    vi.doMock("@/lib/sync", () => ({
      GameSyncService: { getInstance: vi.fn() },
    }));

    const { initializeServices } = await import("@/services");
    await initializeServices();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith("[Services] Proton-GE auto-install failed: boom");
  });

  it("provides cached service instances through getters", async () => {
    const db = { init: vi.fn() };
    const sidecar = { run: vi.fn() };

    const info = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn().mockResolvedValue(undefined);

    const authInstance = { type: "auth" };
    const enrichmentInstance = { type: "enrichment" };
    // const installationInstance = { type: "install" };

    const legendaryInstance = { platform: "epic" };
    const gogdlInstance = { platform: "gog" };
    const nileInstance = { platform: "amazon" };

    const gameLaunchInstance = { launch: vi.fn() };
    const protonInstance = { ensureProtonInstalled: vi.fn().mockResolvedValue(undefined) };
    const windowInstance = { focus: vi.fn() };
    const orchestratorInstance = { sync: vi.fn() };

    vi.doMock("@tauri-apps/plugin-log", () => ({ info, warn }));
    vi.doMock("@/services/base", () => ({
      DatabaseService: { getInstance: vi.fn(() => db) },
      SidecarService: { getInstance: vi.fn(() => sidecar) },
      MIGRATIONS: [],
      SCHEMA: "",
    }));
    vi.doMock("@/services/stores", () => ({
      GameStoreService: class {},
      LegendaryService: { getInstance: vi.fn(() => legendaryInstance) },
      GogdlService: { getInstance: vi.fn(() => gogdlInstance) },
      NileService: { getInstance: vi.fn(() => nileInstance) },
      SteamService: { getInstance: vi.fn(() => ({})) },
    }));
    vi.doMock("@/services/auth", () => ({
      AuthService: { getInstance: vi.fn(() => authInstance) },
      WebviewAuthHandler: class {},
    }));
    vi.doMock("@/services/enrichment", () => ({
      EnrichmentService: { getInstance: vi.fn(() => enrichmentInstance) },
      IgdbEnricher: class {},
      ProtonDbEnricher: class {},
      SteamGridDbEnricher: class {},
    }));
    vi.doMock("@/services/installation", () => ({
      InstallationService: class {
        type = "install";
      },
    }));
    vi.doMock("@/services/launch", () => ({
      GameLaunchService: { getInstance: vi.fn(() => gameLaunchInstance) },
    }));
    vi.doMock("@/services/runners", () => ({
      ProtonService: { getInstance: vi.fn(() => protonInstance) },
    }));
    vi.doMock("@/services/window", () => ({
      WindowService: { getInstance: vi.fn(() => windowInstance) },
    }));
    vi.doMock("@/services/GameLibraryOrchestrator", () => ({
      GameLibraryOrchestrator: { getInstance: vi.fn(() => orchestratorInstance) },
    }));

    const services = await import("@/services");

    const authA = services.getAuthService();
    const authB = services.getAuthService();
    const enrichA = services.getEnrichmentService();
    const enrichB = services.getEnrichmentService();
    const installA = services.getInstallationService();
    const installB = services.getInstallationService();

    expect(authA).toBe(authB);
    expect(enrichA).toBe(enrichB);
    expect(installA).toBe(installB);

    expect(services.getDatabaseService()).toBe(db);
    expect(services.getOrchestrator()).toBe(orchestratorInstance);
    expect(services.getGameLaunchService()).toBe(gameLaunchInstance);
    expect(services.getProtonService()).toBe(protonInstance);
    expect(services.getWindowService()).toBe(windowInstance);
  });
});
