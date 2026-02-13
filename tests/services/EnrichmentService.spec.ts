import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, type Game } from "@/types";

// Mock all dependencies
const mockDbInit = vi.fn();
const mockDbExecute = vi.fn();
const mockDbSelect = vi.fn();
const mockDbQueryOne = vi.fn();

const mockIgdbConfigure = vi.fn();
const mockIgdbSearch = vi.fn();

const mockProtonDbSearchByAppId = vi.fn();

const mockSteamGridDbConfigure = vi.fn();
const mockSteamGridDbSearch = vi.fn();

const mockImageCacheCacheGameImages = vi.fn();
const mockImageCacheClearGameCache = vi.fn();
const mockImageCacheClearAllCache = vi.fn();

// Mock module imports
vi.mock("@/services/base/DatabaseService", () => ({
  DatabaseService: {
    getInstance: vi.fn(() => ({
      init: mockDbInit,
      execute: mockDbExecute,
      select: mockDbSelect,
      queryOne: mockDbQueryOne,
    })),
  },
}));

vi.mock("@/services/enrichment/IgdbEnricher", () => ({
  IgdbEnricher: vi.fn(function (this: any) {
    this.configure = mockIgdbConfigure;
    this.search = mockIgdbSearch;
  }),
}));

vi.mock("@/services/enrichment/ProtonDbEnricher", () => ({
  ProtonDbEnricher: vi.fn(function (this: any) {
    this.searchByAppId = mockProtonDbSearchByAppId;