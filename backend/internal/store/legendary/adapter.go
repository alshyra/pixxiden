package legendary

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/yourusername/pixiden/internal/db"
)

// Adapter wraps the Legendary CLI tool for Epic Games Store
type Adapter struct {
	binaryPath string
	configPath string
}

// LegendaryGame represents a game returned by legendary CLI
type LegendaryGame struct {
	AppName      string `json:"app_name"`
	Title        string `json:"title"`
	Developer    string `json:"developer"`
	Publisher    string `json:"publisher"`
	Version      string `json:"version"`
	InstallPath  string `json:"install_path"`
	Executable   string `json:"executable"`
	IsInstalled  bool   `json:"is_installed"`
}

func NewAdapter(binaryPath, configPath string) *Adapter {
	return &Adapter{
		binaryPath: binaryPath,
		configPath: configPath,
	}
}

// Auth initiates the OAuth2 authentication flow
func (a *Adapter) Auth() error {
	cmd := exec.Command(a.binaryPath, "auth")
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	return cmd.Run()
}

// IsAuthenticated checks if user is authenticated
func (a *Adapter) IsAuthenticated() bool {
	cmd := exec.Command(a.binaryPath, "status")
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	
	output, err := cmd.Output()
	if err != nil {
		return false
	}
	
	return strings.Contains(string(output), "Logged in")
}

// ListGames returns all games in the Epic Games library
func (a *Adapter) ListGames() ([]*db.Game, error) {
	cmd := exec.Command(a.binaryPath, "list", "--json")
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list games: %w", err)
	}

	var legendaryGames []LegendaryGame
	if err := json.Unmarshal(output, &legendaryGames); err != nil {
		return nil, fmt.Errorf("failed to parse games list: %w", err)
	}

	games := make([]*db.Game, 0, len(legendaryGames))
	for _, lg := range legendaryGames {
		game := &db.Game{
			ID:           fmt.Sprintf("epic-%s", lg.AppName),
			Title:        lg.Title,
			StoreID:      "epic",
			AppID:        lg.AppName,
			Installed:    lg.IsInstalled,
			InstallPath:  lg.InstallPath,
			ExecutablePath: lg.Executable,
		}
		games = append(games, game)
	}

	return games, nil
}

// InstallGame starts the installation of a game
func (a *Adapter) InstallGame(appName, installPath string) error {
	cmd := exec.Command(
		a.binaryPath,
		"install",
		appName,
		"--base-path", installPath,
		"-y", // Auto-confirm
	)
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// UninstallGame uninstalls a game
func (a *Adapter) UninstallGame(appName string) error {
	cmd := exec.Command(
		a.binaryPath,
		"uninstall",
		appName,
		"-y",
	)
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// LaunchGame launches a game with optional Wine/Proton wrapper
func (a *Adapter) LaunchGame(appName string, wrapperCmd string) (*exec.Cmd, error) {
	args := []string{"launch", appName}
	
	if wrapperCmd != "" {
		args = append(args, "--wrapper", wrapperCmd)
	}

	cmd := exec.Command(a.binaryPath, args...)
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to launch game: %w", err)
	}

	return cmd, nil
}

// GetGameInfo retrieves detailed information about a game
func (a *Adapter) GetGameInfo(appName string) (*LegendaryGame, error) {
	cmd := exec.Command(a.binaryPath, "info", appName, "--json")
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get game info: %w", err)
	}

	var game LegendaryGame
	if err := json.Unmarshal(output, &game); err != nil {
		return nil, fmt.Errorf("failed to parse game info: %w", err)
	}

	return &game, nil
}

// Sync synchronizes the library with Epic Games Store
func (a *Adapter) Sync() error {
	cmd := exec.Command(a.binaryPath, "list-games")
	cmd.Env = append(os.Environ(), "LEGENDARY_CONFIG_PATH="+a.configPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}
