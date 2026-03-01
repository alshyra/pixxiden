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

  async fetchBySteamId(steamId: string): Promise<UmuEntry | null> {
    const url = `${UMU_API_BASE}?umu_id=umu-${steamId}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data: UmuEntry[] = await response.json();
    if (!response.ok || (!data || data.length === 0)) {
      throw new Error(`No umu entry found for steamid=${steamId}`);
    }
    await info(`[UMU] Found umu_id=${steamId} title=${data[0].title}`);
    return data[0];
  }

  async fetchByTitle(title: string): Promise<UmuEntry | null> {
    const url = `${UMU_API_BASE}?title=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    const data: UmuEntry[] = await response.json();
    if (!response.ok || (!data || data.length === 0)) {
      throw new Error(`No umu entry found for title=${title}`);
    }
    await info(`[UMU] Found title=${title} umu_id=${data[0].umu_id}`);
    return data[0];
  }

  async fetchByCodename(codename: string): Promise<UmuEntry | null> {
    const url = `${UMU_API_BASE}?codename=${encodeURIComponent(codename)}`;
    const response = await fetch(url);
    const data: UmuEntry[] = await response.json();
    if (!response.ok || (!data || data.length === 0)) {
      throw new Error(`No umu entry found for codename=${codename}`);
    }
    await info(`[UMU] Found codename=${codename} umu_id=${codename}`);
    return data[0];
  }

  /**
   * Interroge l'API umu pour récupérer l'entrée correspondant à un storeId (codename).
   *
   * URL : https://umu.openwinecomponents.org/umu_api.php?codename=<storeId>
   * Retourne le premier résultat ou null si absent/erreur.
   */
  async fetchUmuEntry(game: Game): Promise<UmuEntry | null> {
    if (game.storeData.umuId) return null; // déjà associé à une entrée umu, pas besoin de fetch

    if (!game.storeData.storeId) {
      await warn(`[UMU] No storeId for game ${game.info.title}, skipping umu fetch`);
      return null;
    }
    try {
      return await this.fetchByCodename(game.storeData.storeId);
    } catch (error) {
      info(`[UMU] Fetch by codename failed for ${game.info.title} (codename=${game.storeData.storeId})`);
    }
    try {
      return await this.fetchBySteamId(game.storeData.storeId);
    } catch (error) {
      info(`[UMU] Fetch by steamId failed for ${game.info.title} (steamId=${game.storeData.storeId})`);
    }
    try {
      return await this.fetchByTitle(game.info.title);
    } catch (error) {
      info(`[UMU] Fetch by title failed for ${game.info.title} by title search`);
    }
    warn(
      `[UMU] No umu entry found for game ${game.info.title} (storeId=${game.storeData.storeId})`,
    );
    return null;
  }
}
