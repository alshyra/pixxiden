package store

import (
	"os/exec"

	"github.com/yourusername/pixiden/internal/db"
)

// StoreID represents the different game stores
type StoreID string

const (
	StoreEpic   StoreID = "epic"
	StoreGOG    StoreID = "gog"
	StoreAmazon StoreID = "amazon"
)

// Adapter is the common interface for all store adapters
type Adapter interface {
	// Auth initiates the authentication flow for the store
	Auth() error

	// IsAuthenticated checks if the user is authenticated
	IsAuthenticated() bool

	// ListGames returns all games in the store library
	ListGames() ([]*db.Game, error)

	// InstallGame starts the installation of a game
	InstallGame(gameID, installPath string) error

	// UninstallGame uninstalls a game
	UninstallGame(gameID string) error

	// LaunchGame launches a game, returns the process command
	LaunchGame(gameID string, wrapperCmd string) (*exec.Cmd, error)
}

// StoreStatus represents the authentication status of a store
type StoreStatus struct {
	StoreID       StoreID `json:"store_id"`
	Name          string  `json:"name"`
	Authenticated bool    `json:"authenticated"`
	Username      string  `json:"username,omitempty"`
	GameCount     int     `json:"game_count"`
	Error         string  `json:"error,omitempty"`
}

// InstallProgress represents the download/install progress
type InstallProgress struct {
	GameID       string  `json:"game_id"`
	StoreID      StoreID `json:"store_id"`
	Status       string  `json:"status"` // downloading, installing, verifying, completed, failed
	Progress     float64 `json:"progress"` // 0-100
	DownloadSize int64   `json:"download_size"`
	Downloaded   int64   `json:"downloaded"`
	Speed        int64   `json:"speed"` // bytes/sec
	ETA          int64   `json:"eta"`   // seconds remaining
	Error        string  `json:"error,omitempty"`
}
