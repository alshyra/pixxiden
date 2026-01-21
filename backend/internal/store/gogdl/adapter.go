package gogdl

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/yourusername/pixiden/internal/db"
)

// Adapter wraps the GOGdl CLI tool for GOG.com
type Adapter struct {
	binaryPath string
	configPath string
}

// GOGGame represents a game returned by gogdl CLI
type GOGGame struct {
	GameID      string `json:"id"`
	Title       string `json:"title"`
	Developer   string `json:"developer"`
	Publisher   string `json:"publisher"`
	InstallPath string `json:"install_path"`
	Executable  string `json:"executable"`
	IsInstalled bool   `json:"installed"`
}

// GOGAuth represents authentication info from gogdl
type GOGAuth struct {
	Username  string `json:"username"`
	UserID    string `json:"user_id"`
	TokenType string `json:"token_type"`
}

func NewAdapter(binaryPath, configPath string) *Adapter {
	return &Adapter{
		binaryPath: binaryPath,
		configPath: configPath,
	}
}

// Auth initiates authentication via browser
func (a *Adapter) Auth() error {
	// GOGdl uses a code-based auth flow
	cmd := exec.Command(a.binaryPath, "auth", "--steam-import")
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	return cmd.Run()
}

// AuthWithCode authenticates with a code from the GOG auth URL
func (a *Adapter) AuthWithCode(code string) error {
	cmd := exec.Command(a.binaryPath, "auth", "--code", code)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// IsAuthenticated checks if user is authenticated
func (a *Adapter) IsAuthenticated() bool {
	tokenPath := filepath.Join(a.configPath, "token.json")
	if _, err := os.Stat(tokenPath); os.IsNotExist(err) {
		return false
	}

	// Verify token is still valid by trying to list games
	cmd := exec.Command(a.binaryPath, "library", "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return false
	}

	return len(output) > 0 && !strings.Contains(string(output), "error")
}

// GetUsername returns the authenticated username
func (a *Adapter) GetUsername() string {
	tokenPath := filepath.Join(a.configPath, "token.json")
	data, err := os.ReadFile(tokenPath)
	if err != nil {
		return ""
	}

	var auth GOGAuth
	if err := json.Unmarshal(data, &auth); err != nil {
		return ""
	}

	return auth.Username
}

// ListGames returns all games in the GOG library
func (a *Adapter) ListGames() ([]*db.Game, error) {
	cmd := exec.Command(a.binaryPath, "library", "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list GOG games: %w", err)
	}

	var gogGames []GOGGame
	if err := json.Unmarshal(output, &gogGames); err != nil {
		return nil, fmt.Errorf("failed to parse GOG games list: %w", err)
	}

	games := make([]*db.Game, 0, len(gogGames))
	for _, gg := range gogGames {
		game := &db.Game{
			ID:             fmt.Sprintf("gog-%s", gg.GameID),
			Title:          gg.Title,
			StoreID:        "gog",
			AppID:          gg.GameID,
			Installed:      gg.IsInstalled,
			InstallPath:    gg.InstallPath,
			ExecutablePath: gg.Executable,
		}
		games = append(games, game)
	}

	return games, nil
}

// ListInstalled returns only installed games
func (a *Adapter) ListInstalled() ([]*db.Game, error) {
	cmd := exec.Command(a.binaryPath, "installed", "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list installed GOG games: %w", err)
	}

	var gogGames []GOGGame
	if err := json.Unmarshal(output, &gogGames); err != nil {
		return nil, fmt.Errorf("failed to parse installed games: %w", err)
	}

	games := make([]*db.Game, 0, len(gogGames))
	for _, gg := range gogGames {
		game := &db.Game{
			ID:             fmt.Sprintf("gog-%s", gg.GameID),
			Title:          gg.Title,
			StoreID:        "gog",
			AppID:          gg.GameID,
			Installed:      true,
			InstallPath:    gg.InstallPath,
			ExecutablePath: gg.Executable,
		}
		games = append(games, game)
	}

	return games, nil
}

// InstallGame starts the installation of a game
func (a *Adapter) InstallGame(gameID, installPath string) error {
	args := []string{
		"download",
		gameID,
		"--path", installPath,
	}

	cmd := exec.Command(a.binaryPath, args...)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// InstallGameWithLang installs a game with specific language
func (a *Adapter) InstallGameWithLang(gameID, installPath, language string) error {
	args := []string{
		"download",
		gameID,
		"--path", installPath,
		"--lang", language,
	}

	cmd := exec.Command(a.binaryPath, args...)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// UninstallGame uninstalls a game by removing its directory
func (a *Adapter) UninstallGame(gameID, installPath string) error {
	// GOGdl doesn't have a built-in uninstall, we need to remove the directory
	if installPath == "" {
		return fmt.Errorf("install path required for uninstall")
	}

	// Verify the path exists and looks like a game directory
	if _, err := os.Stat(installPath); os.IsNotExist(err) {
		return fmt.Errorf("game not found at %s", installPath)
	}

	return os.RemoveAll(installPath)
}

// LaunchGame launches a game with optional Wine/Proton wrapper
func (a *Adapter) LaunchGame(gameID string, installPath string, wrapperCmd string) (*exec.Cmd, error) {
	// GOGdl doesn't have a built-in launch command
	// We need to find and run the executable
	executable := a.findExecutable(installPath)
	if executable == "" {
		return nil, fmt.Errorf("no executable found in %s", installPath)
	}

	var cmd *exec.Cmd
	if wrapperCmd != "" {
		// Use Wine/Proton wrapper for Windows games
		parts := strings.Fields(wrapperCmd)
		args := append(parts[1:], executable)
		cmd = exec.Command(parts[0], args...)
	} else {
		cmd = exec.Command(executable)
	}

	cmd.Dir = installPath
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to launch game: %w", err)
	}

	return cmd, nil
}

// GetGameInfo retrieves detailed information about a game
func (a *Adapter) GetGameInfo(gameID string) (*GOGGame, error) {
	cmd := exec.Command(a.binaryPath, "info", gameID, "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get game info: %w", err)
	}

	var game GOGGame
	if err := json.Unmarshal(output, &game); err != nil {
		return nil, fmt.Errorf("failed to parse game info: %w", err)
	}

	return &game, nil
}

// Repair verifies and repairs game files
func (a *Adapter) Repair(gameID, installPath string) error {
	cmd := exec.Command(a.binaryPath, "repair", gameID, "--path", installPath)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// getEnv returns the environment with GOGdl config path set
func (a *Adapter) getEnv() []string {
	return append(os.Environ(), "GOGDL_CONFIG_PATH="+a.configPath)
}

// findExecutable finds the main executable in a game directory
func (a *Adapter) findExecutable(installPath string) string {
	// Common executable patterns for GOG games
	patterns := []string{
		"*.exe",        // Windows executables
		"start.sh",     // Linux start script
		"launch.sh",    // Linux launch script
		"game.sh",      // Generic game script
	}

	for _, pattern := range patterns {
		matches, err := filepath.Glob(filepath.Join(installPath, pattern))
		if err == nil && len(matches) > 0 {
			return matches[0]
		}
	}

	// Check game subdirectory
	entries, err := os.ReadDir(installPath)
	if err != nil {
		return ""
	}

	for _, entry := range entries {
		if entry.IsDir() {
			subPath := filepath.Join(installPath, entry.Name())
			for _, pattern := range patterns {
				matches, err := filepath.Glob(filepath.Join(subPath, pattern))
				if err == nil && len(matches) > 0 {
					return matches[0]
				}
			}
		}
	}

	return ""
}
