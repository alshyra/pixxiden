/**
 * Store-related API functions
 */
import { invoke, isMockMode } from "./core";

export interface StoreStatus {
  id: string;
  name: string;
  available: boolean;
  authenticated: boolean;
  cli_tool: string;
  username?: string;
}

export async function getStoreStatus(): Promise<StoreStatus[]> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock store status");
    return [
      {
        id: "epic",
        name: "Epic Games",
        available: true,
        authenticated: false,
        cli_tool: "legendary",
      },
      { id: "gog", name: "GOG Galaxy", available: true, authenticated: false, cli_tool: "gogdl" },
      {
        id: "amazon",
        name: "Amazon Games",
        available: true,
        authenticated: false,
        cli_tool: "nile",
      },
      { id: "steam", name: "Steam", available: true, authenticated: false, cli_tool: "steam" },
    ];
  }

  try {
    const stores = await invoke<StoreStatus[]>("get_store_status");
    return stores;
  } catch (error) {
    console.error("Failed to get store status:", error);
    throw error;
  }
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
