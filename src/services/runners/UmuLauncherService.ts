/**
 * UmuLauncherService - Wraps umu-run pour les jeux non-Steam
 *
 * umu-run est installé comme dépendance système (pas un sidecar bundlé).
 * Il fournit :
 * - Steam Runtime container (Steam Input pour les manettes)
 * - protonfixes database integration
 * - Gestion Proton automatique (pas besoin de PROTONPATH)
 *
 * Commande générée :
 *   GAMEID=<umu_id> STORE=<store> WINEPREFIX=<prefix> umu-run /path/game.exe
 *
 * @see https://github.com/Open-Wine-Components/umu-launcher
 * @see https://umu.openwinecomponents.org/umu_api.php?codename=<storeId>
 */

import { Game } from "@/types";
import { fetch } from "@tauri-apps/plugin-http";
import { info, warn } from "@tauri-apps/plugin-log";

/** Configuration pour construire une commande umu-run */
export interface UmuLaunchConfig {
  /** Chemin du Wine prefix */
  winePrefix: string;
  /** Nom du store (epic, gog, amazon…) */
  store: string;
  /** ID umu canonique retourné par l'API (ex: "umu-1086940") */
  umuId: string;
  /** Chemin vers l'exécutable Windows (.exe) */
  executablePath: string;
}

/** Réponse de l'API umu */
export interface UmuEntry {
  title: string;
  umu_id: string;
  acronym: string;
  codename: string;
  store: string;
  exe_string: string | null;
  notes: string | null;
}

const UMU_API_BASE = "https://umu.openwinecomponents.org/umu_api.php";

export class UmuLauncherService {
  private static instance: UmuLauncherService | null = null;

  private constructor() {}

  static getInstance(): UmuLauncherService {
    if (!UmuLauncherService.instance) {
      UmuLauncherService.instance = new UmuLauncherService();
    }
    return UmuLauncherService.instance;
  }

  /**
   * Mappe le nom interne du store vers la valeur attendue par umu.
   * epic → egs, les autres restent identiques.
   */
  mapStoreToUmu(store: string): string {
    const map: Record<string, string> = { epic: "egs" };
    return map[store] ?? store;
  }

  /**
   * Construit la commande umu-run et les variables d'environnement.
   *
   * Résultat :
   *   command : ["umu-run", "/path/to/game.exe"]
   *   env     : { GAMEID, STORE, WINEPREFIX }
   *
   * Pas de PROTONPATH — umu-run gère Proton lui-même.
   */
  buildDirectLaunch(config: UmuLaunchConfig): [string[], Record<string, string>] {
    const command = ["umu-run", config.executablePath];
    const env: Record<string, string> = {
      GAMEID: config.umuId,
      STORE: this.mapStoreToUmu(config.store),
      WINEPREFIX: config.winePrefix,
    };

    info(`[UMU] Launch: ${command.join(" ")} GAMEID=${env.GAMEID} STORE=${env.STORE}`);

    return [command, env];
  }

  async fetchBySteamId(umuId: string): Promise<UmuEntry | null> {
    const url = `${UMU_API_BASE}?umu_id=umu-${umuId}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        await warn(`[UMU] API responded ${response.status} for umu_id=${umuId}`);
        return null;
      }
      const data: UmuEntry[] = await response.json();
      if (!data || data.length === 0) {
        await info(`[UMU] No entry found for umu_id=${umuId}`);
        return null;
      }
      await info(`[UMU] Found umu_id=${umuId} title=${data[0].title}`);
      return data[0];
    } catch (error) {
      await warn(`[UMU] Fetch by umu_id failed for umu_id=${umuId}: ${error}`);
      return null;
    }
  }

  async fetchByTitle(title: string): Promise<UmuEntry | null> {
    const url = `${UMU_API_BASE}?title=${encodeURIComponent(title)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        await warn(`[UMU] API responded ${response.status} for title=${title}`);
        return null;
      }
      const data: UmuEntry[] = await response.json();
      if (!data || data.length === 0) {
        await info(`[UMU] No entry found for title=${title}`);
        return null;
      }
      await info(`[UMU] Found title=${title} umu_id=${data[0].umu_id}`);
      return data[0];
    } catch (error) {
      await warn(`[UMU] Fetch by title failed for title=${title}: ${error}`);
      return null;
    }
  }

  async fetchByCodename(codename: string): Promise<UmuEntry | null> {
    const url = `${UMU_API_BASE}?codename=${encodeURIComponent(codename)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        await warn(`[UMU] API responded ${response.status} for codename=${codename}`);
        return null;
      }
      const data: UmuEntry[] = await response.json();
      if (!data || data.length === 0) {
        await info(`[UMU] No entry found for codename=${codename}`);
        return null;
      }
      await info(`[UMU] Found codename=${codename} umu_id=${data[0].umu_id}`);
      return data[0];
    } catch (error) {
      await warn(`[UMU] Fetch by codename failed for codename=${codename}: ${error}`);
      return null;
    }
  }

  /**
   * Interroge l'API umu pour récupérer l'entrée correspondant à un storeId (codename).
   *
   * URL : https://umu.openwinecomponents.org/umu_api.php?codename=<storeId>
   * Retourne le premier résultat ou null si absent/erreur.
   */
  async fetchUmuEntry(game: Game): Promise<UmuEntry | null> {
    if (!game.storeData.storeId) {
      await warn(`[UMU] No storeId for game ${game.info.title}, skipping umu fetch`);
      return null;
    }
    try {      
      return await this.fetchByCodename(game.storeData.storeId);
    } catch (error) {
      info(`[UMU] Fetch by codename failed for storeId=${game.storeData.storeId}: ${error}`);
    }
    try {
      return await this.fetchBySteamId(game.storeData.storeId);
    } catch (error) {
      info(`[UMU] Fetch by umu_id failed for storeId=${game.storeData.storeId}: ${error}`);
    }
    try {
      return await this.fetchByTitle(game.info.title);
    } catch (error) {
      info(`[UMU] Fetch by title failed for title=${game.info.title}: ${error}`);
    }
    return null;
  }
}
