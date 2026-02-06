/**
 * Store-related API functions
 */
import { debug } from "@tauri-apps/plugin-log";
import { getSidecar } from "../base";

export interface StoreStatus {
  id: string;
  name: string;
  available: boolean;
  authenticated: boolean;
  cli_tool: string;
  username?: string;
}

interface LegendaryStatus {
  account?: string;
  games_available?: number;
  games_installed?: number;
}

const getEpicGamesStatus: () => Promise<StoreStatus> = async () => {
  const sidecar = getSidecar();
  try {
    const result = await sidecar.runLegendary(["status", "--json"]);
    if (result.code === 0 && result.stdout) {
      const status: LegendaryStatus = JSON.parse(result.stdout);
      debug(JSON.stringify(status));
      debug(`EpicGames stores is connected with user ${status.account}`);
      return {
        id: "epic",
        name: "Epic Games",
        available: true,
        authenticated: !!status.account,
        cli_tool: "legendary",
        username: status.account,
      };
    }
  } catch (error) {
    console.error("Failed to check Epic status:", error);
  }
  return {
    id: "epic",
    name: "Epic Games",
    available: false,
    authenticated: false,
    cli_tool: "legendary",
  };
};

const getGogStatus: () => Promise<StoreStatus> = async () => {
  const sidecar = getSidecar();
  try {
    const result = await sidecar.runGogdl(["list"]);
    return {
      id: "gog",
      name: "GOG",
      available: result.code === 0,
      authenticated: result.code === 0 && !result.stderr.includes("not logged in"),
      cli_tool: "gogdl",
    };
  } catch (error) {
    console.error("Failed to check GOG status:", error);
    return {
      id: "gog",
      name: "GOG",
      available: false,
      authenticated: false,
      cli_tool: "gogdl",
    };
  }
};

const getAmazonGamesStatus: () => Promise<StoreStatus> = async () => {
  const sidecar = getSidecar();
  // Amazon Games (Nile)
  try {
    const result = await sidecar.runNile(["library", "list"]);
    return {
      id: "amazon",
      name: "Amazon Games",
      available: result.code === 0,
      authenticated: result.code === 0 && !result.stderr.includes("not authenticated"),
      cli_tool: "nile",
    };
  } catch (error) {
    return {
      id: "amazon",
      name: "Amazon Games",
      available: false,
      authenticated: false,
      cli_tool: "nile",
    };
  }
};

export async function getStoreStatus(): Promise<StoreStatus[]> {
  const stores: StoreStatus[] = [];

  // Epic Games (Legendary)
  const epicStatus = await getEpicGamesStatus();
  stores.push(epicStatus);

  // GOG (gogdl)
  const gogStatus = await getGogStatus();
  stores.push(gogStatus);

  // Amazon Games (Nile)
  const amazonStatus = await getAmazonGamesStatus();
  stores.push(amazonStatus);

  // Steam (native)
  stores.push({
    id: "steam",
    name: "Steam",
    available: true,
    authenticated: true,
    cli_tool: "steam",
  });

  return stores;
}

// Legacy compatibility functions
export async function authenticateLegendary(): Promise<void> {
  console.warn('authenticateLegendary: Run "legendary auth" in terminal');
}

export async function checkLegendaryStatus(): Promise<{ authenticated: boolean }> {
  const stores = await getStoreStatus();
  const epic = stores.find((s) => s.id === "epic");
  return { authenticated: epic?.authenticated ?? false };
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  return { status: "ok", version: "0.1.0" };
}
