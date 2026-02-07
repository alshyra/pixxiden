/**
 * IGDB module exports
 *
 * - IgdbClient: low-level API client with Tauri fetch + typed responses
 * - generated/: openapi-ts auto-generated types from https://igdb-openapi.s-crypt.co
 */

export { IgdbClient, EXTERNAL_GAME_STEAM } from "./IgdbClient";
export type {
  IgdbClientConfig,
  IgdbGameExpanded,
  InvolvedCompanyExpanded,
  GenreExpanded,
  CoverExpanded,
  ScreenshotExpanded,
  ExternalGameExpanded,
} from "./IgdbClient";

// Re-export key generated types for consumers
export type {
  GameTimeToBeat,
  ExternalGame,
  ExternalGameCategoryEnums,
  Genre,
  Cover,
  Screenshot,
  InvolvedCompany,
  Games,
} from "./generated";
