/**
 * Tests for featuredGameId state management in LibraryStore
 * Covers setFeaturedGame action and derived state.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useLibraryStore } from "@/stores/library";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@/services", () => ({
  initializeServices: vi.fn().mockResolvedValue(undefined),
  getOrchestrator: vi.fn(() => ({
    getAllGames: vi.fn().mockResolvedValue([]),
    syncLibrary: vi.fn().mockResolvedValue({ total: 0, enriched: 0, errors: [] }),
  })),
  getInstallationService: vi.fn(() => ({
    installGame: vi.fn(),
    uninstallGame: vi.fn(),
  })),
  getGameLaunchService: vi.fn(() => ({
    launchFromCommand: vi.fn(),
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LibraryStore – featuredGameId", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("initialises with featuredGameId === null", () => {
    const store = useLibraryStore();
    expect(store.featuredGameId).toBeNull();
  });

  it("setFeaturedGame('123') sets featuredGameId to '123'", () => {
    const store = useLibraryStore();
    store.setFeaturedGame("123");
    expect(store.featuredGameId).toBe("123");
  });

  it("setFeaturedGame(null) resets featuredGameId to null", () => {
    const store = useLibraryStore();
    store.setFeaturedGame("abc");
    store.setFeaturedGame(null);
    expect(store.featuredGameId).toBeNull();
  });

  it("setFeaturedGame can be called multiple times and tracks last value", () => {
    const store = useLibraryStore();
    store.setFeaturedGame("first");
    store.setFeaturedGame("second");
    store.setFeaturedGame("third");
    expect(store.featuredGameId).toBe("third");
  });

  it("featuredGameId is reactive / independent per pinia instance", () => {
    const store1 = useLibraryStore();
    store1.setFeaturedGame("store1-game");

    // Create a fresh pinia to ensure isolation
    setActivePinia(createPinia());
    const store2 = useLibraryStore();
    expect(store2.featuredGameId).toBeNull();
  });
});
