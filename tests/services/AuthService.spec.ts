import { beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "@/services/auth/AuthService";

function createService() {
  const legendary = {
    isAuthenticated: async () => true,
    getAuthUrl: () => "https://epic-auth",
    authenticate: async () => undefined,
    logout: async () => undefined,
  } as any;

  const gogdl = {
    isAuthenticated: async () => false,
    getAuthUrl: () => "https://gog-auth",
    authenticate: async () => undefined,
    logout: async () => undefined,
  } as any;

  const nile = {
    isAuthenticated: async () => true,
    login: async () => ({ success: true }),
    loginWith2FA: async () => ({ success: true }),
    logout: async () => undefined,
  } as any;

  return { service: new AuthService(legendary, gogdl, nile), legendary, gogdl, nile };
}

describe("AuthService", () => {
  beforeEach(() => {
    (AuthService as any).instance = null;
  });

  it("returns all auth statuses", async () => {
    const { service } = createService();

    const statuses = await service.getAllAuthStatus();

    expect(statuses.epic.authenticated).toBe(true);
    expect(statuses.gog.authenticated).toBe(false);
    expect(statuses.amazon.authenticated).toBe(true);
    expect(statuses.steam.authenticated).toBe(true);
  });

  it("returns auth status by store", async () => {
    const { service } = createService();

    expect((await service.getAuthStatus("epic")).authenticated).toBe(true);
    expect((await service.getAuthStatus("gog")).authenticated).toBe(false);
    expect((await service.getAuthStatus("amazon")).authenticated).toBe(true);
    expect((await service.getAuthStatus("steam")).authenticated).toBe(true);
  });

  it("handles epic auth flow", async () => {
    const { service, legendary } = createService();

    expect(await service.startEpicAuth()).toBe("https://epic-auth");
    await service.completeEpicAuth("code");
    await service.logoutEpic();

    expect(legendary.getAuthUrl()).toBe("https://epic-auth");
  });

  it("handles gog auth flow", async () => {
    const { service, gogdl } = createService();

    expect(service.getGogAuthUrl()).toBe("https://gog-auth");
    await service.completeGogAuth("code");
    await service.logoutGog();

    expect(gogdl.getAuthUrl()).toBe("https://gog-auth");
  });

  it("handles amazon login and 2fa flow", async () => {
    const { service } = createService();

    const login = await service.loginAmazon("a@b.c", "pwd");
    const login2fa = await service.loginAmazonWith2FA("a@b.c", "pwd", "123456");

    expect(login.success).toBe(true);
    expect(login2fa.success).toBe(true);

    await service.logoutAmazon();
  });

  it("reuses singleton in getInstance", () => {
    const { legendary, gogdl, nile } = createService();

    const a = AuthService.getInstance(legendary, gogdl, nile);
    const b = AuthService.getInstance(legendary, gogdl, nile);

    expect(a).toBe(b);
  });
});
