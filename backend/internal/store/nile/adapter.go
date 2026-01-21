package nile

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/yourusername/pixiden/internal/db"
)

// Adapter wraps the Nile CLI tool for Amazon Games
type Adapter struct {
	binaryPath string
	configPath string
}

// NileGame represents a game returned by nile CLI
type NileGame struct {
	ID          string `json:"id"`
	ProductID   string `json:"product_id"`
	Title       string `json:"title"`
	Developer   string `json:"developer"`
	Publisher   string `json:"publisher"`
	InstallPath string `json:"install_path"`
	Executable  string `json:"executable"`
	IsInstalled bool   `json:"installed"`
	Size        int64  `json:"size"`
}

// NileAuth represents authentication info
type NileAuth struct {
	Username string `json:"username"`
	UserID   string `json:"user_id"`
}

func NewAdapter(binaryPath, configPath string) *Adapter {
	return &Adapter{
		binaryPath: binaryPath,
		configPath: configPath,
	}
}

// Auth initiates the Amazon authentication flow
func (a *Adapter) Auth() error {
	cmd := exec.Command(a.binaryPath, "auth", "--login")
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	return cmd.Run()
}

// IsAuthenticated checks if user is authenticated
func (a *Adapter) IsAuthenticated() bool {
	cmd := exec.Command(a.binaryPath, "auth", "--status")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return false
	}

	return strings.Contains(string(output), "logged in") || 
	       strings.Contains(string(output), "Logged in")
}

// Logout logs out the current user
func (a *Adapter) Logout() error {
	cmd := exec.Command(a.binaryPath, "auth", "--logout")
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// ListGames returns all games in the Amazon Games library
func (a *Adapter) ListGames() ([]*db.Game, error) {
	cmd := exec.Command(a.binaryPath, "library", "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list Amazon games: %w", err)
	}

	var nileGames []NileGame
	if err := json.Unmarshal(output, &nileGames); err != nil {
		return nil, fmt.Errorf("failed to parse Amazon games list: %w", err)
	}

	games := make([]*db.Game, 0, len(nileGames))
	for _, ng := range nileGames {
		game := &db.Game{
			ID:             fmt.Sprintf("amazon-%s", ng.ID),
			Title:          ng.Title,
			StoreID:        "amazon",
			AppID:          ng.ID,
			Installed:      ng.IsInstalled,
			InstallPath:    ng.InstallPath,
			ExecutablePath: ng.Executable,
		}
		games = append(games, game)
	}

	return games, nil
}

// ListInstalled returns only installed games
func (a *Adapter) ListInstalled() ([]*db.Game, error) {
	cmd := exec.Command(a.binaryPath, "list-installed", "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list installed Amazon games: %w", err)
	}

	var nileGames []NileGame
	if err := json.Unmarshal(output, &nileGames); err != nil {
		return nil, fmt.Errorf("failed to parse installed games: %w", err)
	}

	games := make([]*db.Game, 0, len(nileGames))
	for _, ng := range nileGames {
		game := &db.Game{
			ID:             fmt.Sprintf("amazon-%s", ng.ID),
			Title:          ng.Title,
			StoreID:        "amazon",
			AppID:          ng.ID,
			Installed:      true,
			InstallPath:    ng.InstallPath,
			ExecutablePath: ng.Executable,
		}
		games = append(games, game)
	}

	return games, nil
}

// InstallGame starts the installation of a game
func (a *Adapter) InstallGame(gameID, installPath string) error {
	args := []string{
		"install",
		gameID,
		"--path", installPath,
	}

	cmd := exec.Command(a.binaryPath, args...)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// UninstallGame uninstalls a game
func (a *Adapter) UninstallGame(gameID string) error {
	cmd := exec.Command(a.binaryPath, "uninstall", gameID, "-y")
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// LaunchGame launches a game with optional Wine/Proton wrapper
func (a *Adapter) LaunchGame(gameID string, wrapperCmd string) (*exec.Cmd, error) {
	args := []string{"launch", gameID}

	if wrapperCmd != "" {
		args = append(args, "--wrapper", wrapperCmd)
	}

	cmd := exec.Command(a.binaryPath, args...)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to launch game: %w", err)
	}

	return cmd, nil
}

// GetGameInfo retrieves detailed information about a game
func (a *Adapter) GetGameInfo(gameID string) (*NileGame, error) {
	cmd := exec.Command(a.binaryPath, "info", gameID, "--json")
	cmd.Env = a.getEnv()

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get game info: %w", err)
	}

	var game NileGame
	if err := json.Unmarshal(output, &game); err != nil {
		return nil, fmt.Errorf("failed to parse game info: %w", err)
	}

	return &game, nil
}

// Verify verifies game files integrity
func (a *Adapter) Verify(gameID string) error {
	cmd := exec.Command(a.binaryPath, "verify", gameID)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// Update updates a game to the latest version
func (a *Adapter) Update(gameID string) error {
	cmd := exec.Command(a.binaryPath, "update", gameID)
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// Sync synchronizes the game library
func (a *Adapter) Sync() error {
	cmd := exec.Command(a.binaryPath, "library", "--sync")
	cmd.Env = a.getEnv()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// getEnv returns the environment with Nile config path set
func (a *Adapter) getEnv() []string {
	return append(os.Environ(), "NILE_CONFIG_PATH="+a.configPath)
}
