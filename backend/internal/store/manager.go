package store

import (
	"fmt"
	"os/exec"
	"sync"

	"github.com/yourusername/pixiden/internal/db"
	"github.com/yourusername/pixiden/internal/store/gogdl"
	"github.com/yourusername/pixiden/internal/store/legendary"
	"github.com/yourusername/pixiden/internal/store/nile"
)

// Manager coordinates all store adapters
type Manager struct {
	adapters map[StoreID]Adapter
	mu       sync.RWMutex

	// Configuration paths
	configDir   string
	installDir  string
	wrapperCmd  string
}

// Config holds the store manager configuration
type Config struct {
	ConfigDir      string
	DefaultInstall string
	WrapperCmd     string // Wine/Proton command

	// CLI binary paths
	LegendaryPath string
	GOGdlPath     string
	NilePath      string
}

// NewManager creates a new store manager with all adapters
func NewManager(cfg *Config) *Manager {
	m := &Manager{
		adapters:   make(map[StoreID]Adapter),
		configDir:  cfg.ConfigDir,
		installDir: cfg.DefaultInstall,
		wrapperCmd: cfg.WrapperCmd,
	}

	// Initialize Legendary adapter for Epic Games
	if cfg.LegendaryPath != "" {
		legendaryConfig := cfg.ConfigDir + "/legendary"
		m.adapters[StoreEpic] = legendary.NewAdapter(cfg.LegendaryPath, legendaryConfig)
	}

	// Initialize GOGdl adapter for GOG
	if cfg.GOGdlPath != "" {
		gogConfig := cfg.ConfigDir + "/gogdl"
		m.adapters[StoreGOG] = &gogdlWrapper{
			adapter: gogdl.NewAdapter(cfg.GOGdlPath, gogConfig),
		}
	}

	// Initialize Nile adapter for Amazon Games
	if cfg.NilePath != "" {
		nileConfig := cfg.ConfigDir + "/nile"
		m.adapters[StoreAmazon] = &nileWrapper{
			adapter: nile.NewAdapter(cfg.NilePath, nileConfig),
		}
	}

	return m
}

// GetAdapter returns the adapter for a specific store
func (m *Manager) GetAdapter(storeID StoreID) (Adapter, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	adapter, ok := m.adapters[storeID]
	if !ok {
		return nil, fmt.Errorf("store %s not configured", storeID)
	}

	return adapter, nil
}

// GetAllStatuses returns the status of all configured stores
func (m *Manager) GetAllStatuses() []StoreStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	statuses := make([]StoreStatus, 0, len(m.adapters))

	for storeID, adapter := range m.adapters {
		status := StoreStatus{
			StoreID:       storeID,
			Name:          getStoreName(storeID),
			Authenticated: adapter.IsAuthenticated(),
		}

		if status.Authenticated {
			games, err := adapter.ListGames()
			if err == nil {
				status.GameCount = len(games)
			} else {
				status.Error = err.Error()
			}
		}

		statuses = append(statuses, status)
	}

	return statuses
}

// SyncAllGames synchronizes games from all stores
func (m *Manager) SyncAllGames() ([]*db.Game, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var allGames []*db.Game
	var errors []string

	for storeID, adapter := range m.adapters {
		if !adapter.IsAuthenticated() {
			continue
		}

		games, err := adapter.ListGames()
		if err != nil {
			errors = append(errors, fmt.Sprintf("%s: %v", storeID, err))
			continue
		}

		allGames = append(allGames, games...)
	}

	if len(errors) > 0 && len(allGames) == 0 {
		return nil, fmt.Errorf("failed to sync: %v", errors)
	}

	return allGames, nil
}

// LaunchGame launches a game from any store
func (m *Manager) LaunchGame(storeID StoreID, gameID string) (*exec.Cmd, error) {
	adapter, err := m.GetAdapter(storeID)
	if err != nil {
		return nil, err
	}

	return adapter.LaunchGame(gameID, m.wrapperCmd)
}

// InstallGame installs a game from any store
func (m *Manager) InstallGame(storeID StoreID, gameID string, installPath string) error {
	adapter, err := m.GetAdapter(storeID)
	if err != nil {
		return err
	}

	if installPath == "" {
		installPath = m.installDir
	}

	return adapter.InstallGame(gameID, installPath)
}

// UninstallGame uninstalls a game from any store
func (m *Manager) UninstallGame(storeID StoreID, gameID string) error {
	adapter, err := m.GetAdapter(storeID)
	if err != nil {
		return err
	}

	return adapter.UninstallGame(gameID)
}

// Authenticate authenticates with a specific store
func (m *Manager) Authenticate(storeID StoreID) error {
	adapter, err := m.GetAdapter(storeID)
	if err != nil {
		return err
	}

	return adapter.Auth()
}

// getStoreName returns the display name for a store
func getStoreName(storeID StoreID) string {
	switch storeID {
	case StoreEpic:
		return "Epic Games Store"
	case StoreGOG:
		return "GOG.com"
	case StoreAmazon:
		return "Amazon Games"
	default:
		return string(storeID)
	}
}

// gogdlWrapper wraps GOGdl adapter to implement the Adapter interface
type gogdlWrapper struct {
	adapter *gogdl.Adapter
}

func (w *gogdlWrapper) Auth() error {
	return w.adapter.Auth()
}

func (w *gogdlWrapper) IsAuthenticated() bool {
	return w.adapter.IsAuthenticated()
}

func (w *gogdlWrapper) ListGames() ([]*db.Game, error) {
	return w.adapter.ListGames()
}

func (w *gogdlWrapper) InstallGame(gameID, installPath string) error {
	return w.adapter.InstallGame(gameID, installPath)
}

func (w *gogdlWrapper) UninstallGame(gameID string) error {
	// GOGdl requires install path for uninstall
	return fmt.Errorf("uninstall requires install path for GOG games")
}

func (w *gogdlWrapper) LaunchGame(gameID string, wrapperCmd string) (*exec.Cmd, error) {
	// GOGdl requires install path for launch
	return nil, fmt.Errorf("launch requires install path for GOG games")
}

// nileWrapper wraps Nile adapter to implement the Adapter interface
type nileWrapper struct {
	adapter *nile.Adapter
}

func (w *nileWrapper) Auth() error {
	return w.adapter.Auth()
}

func (w *nileWrapper) IsAuthenticated() bool {
	return w.adapter.IsAuthenticated()
}

func (w *nileWrapper) ListGames() ([]*db.Game, error) {
	return w.adapter.ListGames()
}

func (w *nileWrapper) InstallGame(gameID, installPath string) error {
	return w.adapter.InstallGame(gameID, installPath)
}

func (w *nileWrapper) UninstallGame(gameID string) error {
	return w.adapter.UninstallGame(gameID)
}

func (w *nileWrapper) LaunchGame(gameID string, wrapperCmd string) (*exec.Cmd, error) {
	return w.adapter.LaunchGame(gameID, wrapperCmd)
}
