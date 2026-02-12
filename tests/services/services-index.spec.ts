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
    const AuthService = vi.fn(
      class {
        type = "auth";
        constructor(..._args: unknown[]) {}
      },
    );
    const EnrichmentService = vi.fn(
      class {
        type = "enrichment";
        constructor(..._args: unknown[]) {}
      },
    );
    const InstallationService = vi.fn(
      class {
        type = "install";
        constructor(..._args: unknown[]) {}
      },
    );
    const LegendaryService = vi.fn(
      class {
        platform = "epic";
        constructor(..._args: unknown[]) {}
      },
    );
    const GogdlService = vi.fn(
      class {
        platform = "gog";
        constructor(..._args: unknown[]) {}
      },
    );
    const NileService = vi.fn(
      class {
        platform = "amazon";
        constructor(..._args: unknown[]) {}
      },
    );
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
      LegendaryService,
      GogdlService,
      NileService,
      SteamService: class {},
    }));
    vi.doMock("@/services/auth", () => ({
      AuthService,
      WebviewAuthHandler: class {},
    }));
    vi.doMock("@/services/enrichment", () => ({
      EnrichmentService,
      IgdbEnricher: class {},
      ProtonDbEnricher: class {},
      SteamGridDbEnricher: class {},
    }));
    vi.doMock("@/services/installation", () => ({ InstallationService }));
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
    expect(AuthService).toHaveBeenCalledTimes(1);
    expect(LegendaryService).toHaveBeenCalledWith(sidecar, db);
    expect(GogdlService).toHaveBeenCalledWith(sidecar, db);
    expect(NileService).toHaveBeenCalledWith(sidecar, db);
    expect(EnrichmentService).toHaveBeenCalledWith(db);
    expect(InstallationService).toHaveBeenCalledWith(sidecar, db);

    expect(services.getDatabaseService()).toBe(db);
    expect(services.getOrchestrator()).toBe(orchestratorInstance);
    expect(services.getGameLaunchService()).toBe(gameLaunchInstance);
    expect(services.getProtonService()).toBe(protonInstance);
    expect(services.getWindowService()).toBe(windowInstance);
  });
});
