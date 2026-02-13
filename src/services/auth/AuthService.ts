/**
 * AuthService - Orchestrates authentication for all stores
 */

import type { AuthStatus, StoreType } from "@/types";
import { GogdlService } from "../stores/GogdlService";
import { LegendaryService } from "../stores/LegendaryService";
import { NileService, type NileAuthResult } from "../stores/NileService";

export interface AuthStatusMap {
  epic: AuthStatus;
  gog: AuthStatus;
  amazon: AuthStatus;
  steam: AuthStatus;
}

export class AuthService {
  private static instance: AuthService | null = null;

  private legendary: LegendaryService;
  private gogdl: GogdlService;
  private nile: NileService;

  private constructor() {
    this.legendary = LegendaryService.getInstance();
    this.gogdl = GogdlService.getInstance();
    this.nile = NileService.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get authentication status for all stores
   */
  async getAllAuthStatus(): Promise<AuthStatusMap> {
    const [epic, gog, amazon] = await Promise.all([
      this.getEpicAuthStatus(),
      this.getGogAuthStatus(),
      this.getAmazonAuthStatus(),
    ]);

    return {
      epic,
      gog,
      amazon,
      steam: { authenticated: true, configSource: "none" }, // Steam handled by Steam client
    };
  }

  /**
   * Get auth status for a specific store
   */
  async getAuthStatus(store: StoreType): Promise<AuthStatus> {
    switch (store) {
      case "epic":
        return this.getEpicAuthStatus();
      case "gog":
        return this.getGogAuthStatus();
      case "amazon":
        return this.getAmazonAuthStatus();
      case "steam":
        return { authenticated: true, configSource: "none" };
    }
  }

  // ===== Epic Games =====

  private async getEpicAuthStatus(): Promise<AuthStatus> {
    const isAuth = await this.legendary.isAuthenticated();
    return {
      authenticated: isAuth,
      configSource: isAuth ? "pixxiden" : "none",
    };
  }

  async startEpicAuth(): Promise<string> {
    // Return the authentication URL that users should open in their browser
    return this.legendary.getAuthUrl();
  }

  async completeEpicAuth(authorizationCode: string): Promise<void> {
    await this.legendary.authenticate(authorizationCode);
    console.log("✅ Epic authentication successful");
  }

  async logoutEpic(): Promise<void> {
    await this.legendary.logout();
    console.log("✅ Epic logout successful");
  }

  // ===== GOG =====

  private async getGogAuthStatus(): Promise<AuthStatus> {
    const isAuth = await this.gogdl.isAuthenticated();
    return {
      authenticated: isAuth,
      configSource: isAuth ? "pixxiden" : "none",
    };
  }

  /**
   * Get the GOG OAuth authorization URL
   */
  getGogAuthUrl(): string {
    return this.gogdl.getAuthUrl();
  }

  /**
   * Complete GOG authentication with an authorization code
   */
  async completeGogAuth(authorizationCode: string): Promise<void> {
    await this.gogdl.authenticate(authorizationCode);
    console.log("✅ GOG authentication successful");
  }

  async logoutGog(): Promise<void> {
    await this.gogdl.logout();
    console.log("✅ GOG logout successful");
  }

  // ===== Amazon =====

  private async getAmazonAuthStatus(): Promise<AuthStatus> {
    const isAuth = await this.nile.isAuthenticated();
    return {
      authenticated: isAuth,
      configSource: isAuth ? "pixxiden" : "none",
    };
  }

  async loginAmazon(email: string, password: string): Promise<NileAuthResult> {
    const result = await this.nile.login(email, password);
    if (result.success) {
      console.log("✅ Amazon authentication successful");
    }
    return result;
  }

  async loginAmazonWith2FA(email: string, password: string, code: string): Promise<NileAuthResult> {
    const result = await this.nile.loginWith2FA(email, password, code);
    if (result.success) {
      console.log("✅ Amazon 2FA authentication successful");
    }
    return result;
  }

  async logoutAmazon(): Promise<void> {
    await this.nile.logout();
    console.log("✅ Amazon logout successful");
  }
}
