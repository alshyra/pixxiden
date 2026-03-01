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
 * UMU Database: Fetched once in bulk from umu_api.php and stored in local SQLite.
 * Game lookups are instant SQLite queries instead of individual HTTP requests.
 *
 * @see https://github.com/Open-Wine-Components/umu-launcher
 * @see https://umu.openwinecomponents.org/umu_api.php
 */

import { Game } from "@/types";
import { info, warn } from "@tauri-apps/plugin-log";
import { UmuRepository } from "@/lib/database/UmuRepository";

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

  /**
   * Look up a UMU entry for a game using the local SQLite database.
   * Tries: codename → umu_id (from steamId) → title (fallback).
   * All lookups are instant local SQLite queries — no HTTP requests.
   */
  async fetchUmuEntry(game: Game): Promise<UmuEntry | null> {
    if (game.storeData.umuId) return null; // Already has UMU ID

    if (!game.storeData.storeId) {
      await warn(`[UMU] No storeId for game ${game.info.title}, skipping umu lookup`);
      return null;
    }

    const umuRepo = UmuRepository.getInstance();

    // Try by codename (most common match for store IDs)
    try {
      const entry = await umuRepo.findByCodename(game.storeData.storeId);
      if (entry) {
        await info(`[UMU] Found by codename: ${game.info.title} → ${entry.umu_id}`);
        return entry;
      }
    } catch {
      // Continue to next lookup
    }

    // Try by umu_id (e.g. "umu-<steamId>")
    try {
      const entry = await umuRepo.findByUmuId(`umu-${game.storeData.storeId}`);
      if (entry) {
        await info(`[UMU] Found by umu_id: ${game.info.title} → ${entry.umu_id}`);
        return entry;
      }
    } catch {
      // Continue to next lookup
    }

    // Try by title (fallback)
    try {
      const entry = await umuRepo.findByTitle(game.info.title);
      if (entry) {
        await info(`[UMU] Found by title: ${game.info.title} → ${entry.umu_id}`);
        return entry;
      }
    } catch {
      // No match found
    }

    await warn(
      `[UMU] No umu entry found for game ${game.info.title} (storeId=${game.storeData.storeId})`,
    );
    return null;
  }
}
