package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// GameSource représente l'origine du jeu
type GameSource string

const (
	SourceHeroic GameSource = "heroic"
	SourceSteam  GameSource = "steam"
	SourceManual GameSource = "manual"
)

// Platform représente la plateforme du jeu
type Platform string

const (
	PlatformEpic   Platform = "epic"
	PlatformGOG    Platform = "gog"
	PlatformAmazon Platform = "amazon"
	PlatformSteam  Platform = "steam"
)

// GameExtended structure étendue avec métadonnées
type GameExtended struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Executable  string     `json:"executable"`
	ProcessName string     `json:"process_name,omitempty"` // Nom du processus réel (ex: Naheulbeuk.exe)
	Source      GameSource `json:"source"`
	Platform    Platform   `json:"platform"`
	AppID       string     `json:"app_id,omitempty"`      // Steam App ID ou Epic App Name
	CoverURL    string     `json:"cover_url,omitempty"`
	Installed   bool       `json:"installed"`
	InstallPath string     `json:"install_path,omitempty"`
}

// =============================================================================
// HEROIC GAMES LAUNCHER
// =============================================================================

// Structure des fichiers installed.json de Heroic
type HeroicInstalledGame struct {
	AppName      string `json:"appName"`
	Title        string `json:"title"`
	InstallPath  string `json:"install_path"`
	Executable   string `json:"executable"`
	Version      string `json:"version"`
	Platform     string `json:"platform"` // "linux", "windows", "Mac"
	IsNative     bool   `json:"is_native"`
	Runner       string `json:"runner"` // "legendary" (Epic), "gog", "nile" (Amazon)
}

// ParseHeroicGames lit les jeux installés via Heroic
func ParseHeroicGames() ([]GameExtended, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("impossible de trouver le home: %w", err)
	}

	heroicCacheDir := filepath.Join(homeDir, ".config", "heroic", "store_cache")
	heroicConfigDir := filepath.Join(homeDir, ".config", "heroic")
	
	var games []GameExtended

	// Lire le fichier legendary pour les noms d'executables réels
	legendaryExecs := loadLegendaryExecutables(heroicConfigDir)

	// Parser Epic Games (Legendary)
	epicGames, err := parseHeroicInstallInfo(heroicCacheDir, "legendary", PlatformEpic, legendaryExecs)
	if err != nil {
		log.Printf("⚠️  Erreur parsing Epic Games: %v", err)
	} else {
		games = append(games, epicGames...)
		log.Printf("📦 Epic Games trouvés: %d", len(epicGames))
	}

	// Parser GOG Games (format différent - fichier séparé)
	gogGames, err := parseGOGInstalledGames(heroicConfigDir)
	if err != nil {
		log.Printf("⚠️  Erreur parsing GOG: %v", err)
	} else {
		games = append(games, gogGames...)
		log.Printf("📦 GOG Games trouvés: %d", len(gogGames))
	}

	// Parser Amazon Games (Nile)
	amazonGames, err := parseHeroicInstallInfo(heroicCacheDir, "nile", PlatformAmazon, nil)
	if err != nil {
		log.Printf("⚠️  Erreur parsing Amazon: %v", err)
	} else {
		games = append(games, amazonGames...)
		log.Printf("📦 Amazon Games trouvés: %d", len(amazonGames))
	}

	return games, nil
}

// parseHeroicInstallInfo lit le fichier d'installation d'un store spécifique
func parseHeroicInstallInfo(heroicCacheDir, storeName string, platform Platform, execMap map[string]string) ([]GameExtended, error) {
	// Les fichiers sont nommés {store}_install_info.json
	installInfoFile := filepath.Join(heroicCacheDir, fmt.Sprintf("%s_install_info.json", storeName))

	// Vérifier si le fichier existe
	if _, err := os.Stat(installInfoFile); os.IsNotExist(err) {
		return []GameExtended{}, nil // Pas d'erreur, juste aucun jeu
	}

	data, err := ioutil.ReadFile(installInfoFile)
	if err != nil {
		return nil, fmt.Errorf("erreur lecture %s: %w", installInfoFile, err)
	}

	// Format: { "appName": { "game": {...}, "install": {...} }, "__timestamp": {...} }
	var installInfo map[string]interface{}
	if err := json.Unmarshal(data, &installInfo); err != nil {
		return nil, fmt.Errorf("erreur parsing JSON %s: %w", installInfoFile, err)
	}

	var games []GameExtended

	for key, value := range installInfo {
		// Ignorer les clés spéciales comme __timestamp
		if strings.HasPrefix(key, "__") {
			continue
		}

		entry, ok := value.(map[string]interface{})
		if !ok {
			continue
		}

		// Vérifier qu'il y a une clé "game"
		gameData, ok := entry["game"].(map[string]interface{})
		if !ok {
			continue
		}

		// Vérifier qu'il y a une clé "install" (= jeu installé)
		installData, ok := entry["install"].(map[string]interface{})
		if !ok || installData == nil {
			// Pas d'install = jeu pas installé
			continue
		}

		// Extraire les infos du jeu
		appName, _ := gameData["app_name"].(string)
		title, _ := gameData["title"].(string)

		if appName == "" || title == "" {
			continue
		}

		// Extraire le chemin d'installation
		installPath := ""
		if path, ok := installData["install_path"].(string); ok {
			installPath = path
		}

		// Chercher la cover dans le cache Heroic
		coverURL := findHeroicCover(appName)

		// Chercher le nom du processus réel depuis la map legendary
		processName := ""
		if execMap != nil {
			if exec, ok := execMap[appName]; ok {
				processName = exec
			}
		}

		game := GameExtended{
			ID:          fmt.Sprintf("%s_%s", platform, appName),
			Title:       title,
			Executable:  fmt.Sprintf("xdg-open heroic://launch/%s", appName),
			ProcessName: processName,
			Source:      SourceHeroic,
			Platform:    platform,
			AppID:       appName,
			Installed:   true,
			InstallPath: installPath,
			CoverURL:    coverURL,
		}

		games = append(games, game)
	}

	return games, nil
}

// loadLegendaryExecutables lit le fichier legendary installed.json pour obtenir les noms d'executables
func loadLegendaryExecutables(heroicConfigDir string) map[string]string {
	legendaryFile := filepath.Join(heroicConfigDir, "legendaryConfig", "legendary", "installed.json")
	
	result := make(map[string]string)
	
	data, err := ioutil.ReadFile(legendaryFile)
	if err != nil {
		log.Printf("⚠️  Impossible de lire legendary installed.json: %v", err)
		return result
	}
	
	var installed map[string]map[string]interface{}
	if err := json.Unmarshal(data, &installed); err != nil {
		log.Printf("⚠️  Erreur parsing legendary installed.json: %v", err)
		return result
	}
	
	for appName, gameData := range installed {
		if exec, ok := gameData["executable"].(string); ok {
			result[appName] = exec
			log.Printf("📝 Executable pour %s: %s", appName, exec)
		}
	}
	
	return result
}

// =============================================================================
// GOG (via Heroic - format différent)
// =============================================================================

// findHeroicCover cherche une cover dans le cache Heroic
func findHeroicCover(appName string) string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ""
	}

	iconsDir := filepath.Join(homeDir, ".config", "heroic", "icons")
	
	// Extensions possibles
	extensions := []string{".jpg", ".png", ".webp"}
	
	for _, ext := range extensions {
		coverPath := filepath.Join(iconsDir, appName+ext)
		if _, err := os.Stat(coverPath); err == nil {
			// Retourner en tant que file:// URL pour le frontend
			return "file://" + coverPath
		}
	}
	
	return ""
}

// Structure du fichier gog_store/installed.json
type GOGInstalledGame struct {
	Platform      string   `json:"platform"`
	Executable    string   `json:"executable"`
	InstallPath   string   `json:"install_path"`
	InstallSize   string   `json:"install_size"`
	IsDLC         bool     `json:"is_dlc"`
	Version       string   `json:"version"`
	AppName       string   `json:"appName"`
	InstalledDLCs []string `json:"installedDLCs"`
	Language      string   `json:"language"`
}

type GOGInstalledFile struct {
	Installed []GOGInstalledGame `json:"installed"`
}

// Structure du fichier gog_library.json
type GOGLibraryGame struct {
	AppName string `json:"app_name"`
	Title   string `json:"title"`
}

type GOGLibraryFile struct {
	Games []GOGLibraryGame `json:"games"`
}

// parseGOGInstalledGames lit les jeux GOG installés via Heroic
func parseGOGInstalledGames(heroicConfigDir string) ([]GameExtended, error) {
	// Fichier des jeux installés
	installedFile := filepath.Join(heroicConfigDir, "gog_store", "installed.json")
	// Fichier de la bibliothèque (pour les titres)
	libraryFile := filepath.Join(heroicConfigDir, "store_cache", "gog_library.json")

	// Vérifier si le fichier existe
	if _, err := os.Stat(installedFile); os.IsNotExist(err) {
		return []GameExtended{}, nil
	}

	// Lire le fichier installed.json
	installedData, err := ioutil.ReadFile(installedFile)
	if err != nil {
		return nil, fmt.Errorf("erreur lecture %s: %w", installedFile, err)
	}

	var installedGames GOGInstalledFile
	if err := json.Unmarshal(installedData, &installedGames); err != nil {
		return nil, fmt.Errorf("erreur parsing JSON %s: %w", installedFile, err)
	}

	// Lire la bibliothèque pour avoir les titres
	titleMap := make(map[string]string)
	if libraryData, err := ioutil.ReadFile(libraryFile); err == nil {
		var library GOGLibraryFile
		if json.Unmarshal(libraryData, &library) == nil {
			for _, game := range library.Games {
				titleMap[game.AppName] = game.Title
			}
		}
	}

	var games []GameExtended
	for _, gog := range installedGames.Installed {
		// Ignorer les DLCs
		if gog.IsDLC {
			continue
		}

		// Récupérer le titre depuis la bibliothèque
		title := titleMap[gog.AppName]
		if title == "" {
			// Fallback: utiliser le nom du dossier d'installation
			title = filepath.Base(gog.InstallPath)
		}

		// Chercher la cover dans le cache Heroic
		coverURL := findHeroicCover(gog.AppName)

		game := GameExtended{
			ID:          fmt.Sprintf("gog_%s", gog.AppName),
			Title:       title,
			Executable:  fmt.Sprintf("xdg-open heroic://launch/%s", gog.AppName),
			Source:      SourceHeroic,
			Platform:    PlatformGOG,
			AppID:       gog.AppName,
			Installed:   true,
			InstallPath: gog.InstallPath,
			CoverURL:    coverURL,
		}

		games = append(games, game)
	}

	return games, nil
}

// =============================================================================
// STEAM
// =============================================================================

// Structure des fichiers .acf de Steam
type SteamAppManifest struct {
	AppState struct {
		AppID         string `json:"appid"`
		Name          string `json:"name"`
		StateFlags    string `json:"StateFlags"`
		InstallDir    string `json:"installdir"`
		LastUpdated   string `json:"LastUpdated"`
		SizeOnDisk    string `json:"SizeOnDisk"`
		BytesToDownload string `json:"BytesToDownload"`
		BytesDownloaded string `json:"BytesDownloaded"`
	} `json:"AppState"`
}

// ParseSteamGames lit les jeux Steam installés
func ParseSteamGames() ([]GameExtended, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("impossible de trouver le home: %w", err)
	}

	// Chemins possibles pour Steam
	steamPaths := []string{
		filepath.Join(homeDir, ".steam", "steam", "steamapps"),
		filepath.Join(homeDir, ".local", "share", "Steam", "steamapps"),
	}

	var games []GameExtended

	for _, steamPath := range steamPaths {
		if _, err := os.Stat(steamPath); os.IsNotExist(err) {
			continue
		}

		log.Printf("🔍 Scan Steam: %s", steamPath)

		// Lire tous les fichiers .acf
		files, err := filepath.Glob(filepath.Join(steamPath, "appmanifest_*.acf"))
		if err != nil {
			log.Printf("⚠️  Erreur glob Steam: %v", err)
			continue
		}

		log.Printf("📦 Fichiers Steam trouvés: %d", len(files))

		for _, file := range files {
			game, err := parseSteamACF(file)
			if err != nil {
				// Ignorer les erreurs et continuer (jeu non installé, tool, etc)
				continue
			}
			games = append(games, game)
		}

		// On a trouvé un répertoire Steam valide, pas besoin de chercher ailleurs
		if len(games) > 0 || len(files) > 0 {
			break
		}
	}

	log.Printf("📦 Steam Games trouvés: %d", len(games))
	return games, nil
}

// parseSteamACF lit un fichier .acf et retourne le jeu
func parseSteamACF(filename string) (GameExtended, error) {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return GameExtended{}, err
	}

	// Parser le format VDF (format personnalisé de Valve)
	appID, name, stateFlags := parseVDF(string(data))
	
	if appID == "" || name == "" {
		return GameExtended{}, fmt.Errorf("données invalides dans %s", filename)
	}

	// Filtrer les jeux par StateFlags
	// StateFlags: "4" = NORMAL/INSTALLED
	// Ignorer les tools, runtime, depot, etc.
	if stateFlags != "4" {
		return GameExtended{}, fmt.Errorf("jeu non installé (StateFlags=%s)", stateFlags)
	}

	// Filtrer les jeux système/tools
	if strings.Contains(name, "Linux Runtime") || 
	   strings.Contains(name, "Proton") ||
	   strings.Contains(name, "Steam Linux") ||
	   strings.Contains(name, "Steamworks Common") {
		return GameExtended{}, fmt.Errorf("système/tool ignoré: %s", name)
	}

	game := GameExtended{
		ID:         fmt.Sprintf("steam_%s", appID),
		Title:      name,
		Executable: fmt.Sprintf("xdg-open steam://rungameid/%s", appID),
		Source:     SourceSteam,
		Platform:   PlatformSteam,
		AppID:      appID,
		Installed:  true,
		CoverURL:   fmt.Sprintf("https://steamcdn-a.akamaihd.net/steam/apps/%s/library_600x900.jpg", appID),
	}

	return game, nil
}

// parseVDF parse le format VDF simple de Steam pour extraire appid, name et StateFlags
func parseVDF(content string) (appID, name, stateFlags string) {
	lines := strings.Split(content, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Chercher "appid" "123456"
		if strings.Contains(line, "\"appid\"") {
			parts := strings.Split(line, "\"")
			if len(parts) >= 4 {
				appID = parts[3]
			}
		}
		
		// Chercher "name" "Game Name"
		if strings.Contains(line, "\"name\"") {
			parts := strings.Split(line, "\"")
			if len(parts) >= 4 {
				name = parts[3]
			}
		}

		// Chercher "StateFlags" "4"
		if strings.Contains(line, "\"StateFlags\"") {
			parts := strings.Split(line, "\"")
			if len(parts) >= 4 {
				stateFlags = parts[3]
			}
		}
		
		// Optimisation : on peut s'arrêter une fois qu'on a les trois
		if appID != "" && name != "" && stateFlags != "" {
			break
		}
	}
	
	return appID, name, stateFlags
}

// =============================================================================
// AGRÉGATEUR
// =============================================================================

// GetAllGames récupère tous les jeux de toutes les sources
func GetAllGames() []GameExtended {
	var allGames []GameExtended

	log.Println("🔍 Scan des sources de jeux...")

	// 1. Heroic Games Launcher
	heroicGames, err := ParseHeroicGames()
	if err != nil {
		log.Printf("❌ Erreur Heroic: %v", err)
	} else {
		allGames = append(allGames, heroicGames...)
		log.Printf("✅ Heroic: %d jeux", len(heroicGames))
	}

	// 2. Steam
	steamGames, err := ParseSteamGames()
	if err != nil {
		log.Printf("❌ Erreur Steam: %v", err)
	} else {
		allGames = append(allGames, steamGames...)
		log.Printf("✅ Steam: %d jeux", len(steamGames))
	}

	log.Printf("📦 Total: %d jeux trouvés", len(allGames))

	return allGames
}

// ConvertToLegacyGame convertit GameExtended vers l'ancien format Game
func ConvertToLegacyGame(extended GameExtended) Game {
	return Game{
		ID:         extended.ID,
		Title:      extended.Title,
		Executable: extended.Executable,
	}
}
