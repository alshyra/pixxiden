/**
 * Steam VDF/ACF Parser
 * Parses Steam's VDF (Valve Data Format) files
 */

export interface SteamLibraryFolder {
  path: string;
  label: string;
  contentid: string;
  totalsize: string;
  apps: Record<string, string>; // appid -> size
}

export interface SteamAppManifest {
  appid: string;
  name: string;
  installdir: string;
  StateFlags: string;
  SizeOnDisk: string;
  buildid: string;
  LastUpdated: string;
  UpdateResult: string;
}

/**
 * Simple VDF parser for Steam's libraryfolders.vdf
 * Format example:
 * "libraryfolders"
 * {
 *   "0"
 *   {
 *     "path" "/home/user/.local/share/Steam"
 *     "label" ""
 *     "apps"
 *     {
 *       "570" "15000000000"
 *     }
 *   }
 * }
 */
export function parseLibraryFoldersVdf(content: string): SteamLibraryFolder[] {
  const folders: SteamLibraryFolder[] = [];
  const lines = content.split("\n").map((line) => line.trim());

  let currentFolder: Partial<SteamLibraryFolder> | null = null;
  let inApps = false;
  let braceDepth = 0;
  let folderBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and comments
    if (!line || line.startsWith("//")) continue;

    // Track brace depth
    if (line === "{") {
      braceDepth++;
      if (currentFolder && !inApps) {
        folderBraceDepth = braceDepth;
      }
      continue;
    }

    if (line === "}") {
      braceDepth--;

      // End of apps section
      if (inApps && braceDepth === folderBraceDepth) {
        inApps = false;
      }

      // End of folder section
      if (currentFolder && braceDepth < folderBraceDepth) {
        if (currentFolder.path) {
          folders.push({
            path: currentFolder.path,
            label: currentFolder.label || "",
            contentid: currentFolder.contentid || "",
            totalsize: currentFolder.totalsize || "0",
            apps: currentFolder.apps || {},
          });
        }
        currentFolder = null;
        folderBraceDepth = 0;
      }
      continue;
    }

    // Parse key-value pairs
    const match = line.match(/"([^"]+)"\s+"([^"]*)"/);
    if (match) {
      const [, key, value] = match;

      // Start of a new folder (key is numeric)
      if (/^\d+$/.test(key) && braceDepth === 1) {
        currentFolder = { apps: {} };
        continue;
      }

      if (!currentFolder) continue;

      // Parse folder properties
      if (key === "path") {
        currentFolder.path = value;
      } else if (key === "label") {
        currentFolder.label = value;
      } else if (key === "contentid") {
        currentFolder.contentid = value;
      } else if (key === "totalsize") {
        currentFolder.totalsize = value;
      } else if (key === "apps") {
        inApps = true;
      } else if (inApps && currentFolder.apps) {
        // App ID -> Size mapping
        currentFolder.apps[key] = value;
      }
    }
  }

  return folders;
}

/**
 * Parse ACF (App Cache File) manifest
 * Format example:
 * "AppState"
 * {
 *   "appid" "570"
 *   "name" "Dota 2"
 *   "installdir" "dota 2 beta"
 *   "StateFlags" "4"
 *   "SizeOnDisk" "15000000000"
 * }
 */
export function parseAppManifestAcf(content: string): SteamAppManifest | null {
  const lines = content.split("\n").map((line) => line.trim());
  const manifest: Partial<SteamAppManifest> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines, comments, and braces
    if (!line || line.startsWith("//") || line === "{" || line === "}") continue;

    // Parse key-value pairs
    const match = line.match(/"([^"]+)"\s+"([^"]*)"/);
    if (match) {
      const [, key, value] = match;

      if (key === "appid") manifest.appid = value;
      else if (key === "name") manifest.name = value;
      else if (key === "installdir") manifest.installdir = value;
      else if (key === "StateFlags") manifest.StateFlags = value;
      else if (key === "SizeOnDisk") manifest.SizeOnDisk = value;
      else if (key === "buildid") manifest.buildid = value;
      else if (key === "LastUpdated") manifest.LastUpdated = value;
      else if (key === "UpdateResult") manifest.UpdateResult = value;
    }
  }

  // Validate required fields
  if (manifest.appid && manifest.name) {
    return manifest as SteamAppManifest;
  }

  return null;
}
