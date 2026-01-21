package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"time"

	"github.com/yourusername/pixiden/internal/db"
	"github.com/yourusername/pixiden/internal/download"
	"github.com/yourusername/pixiden/internal/store"
	"github.com/yourusername/pixiden/internal/store/legendary"

	log "github.com/sirupsen/logrus"
)

type Server struct {
	port             int
	db               *db.Database
	legendaryAdapter *legendary.Adapter
	storeManager     *store.Manager
	downloadManager  *download.Manager
	httpServer       *http.Server
}

func NewServer(port int, database *db.Database, legendaryAdapter *legendary.Adapter) *Server {
	// Create download manager
	dlManager := download.NewManager(2)

	// Register legendary command builder
	dlManager.RegisterStore("epic", func(gameID, installPath string) *exec.Cmd {
		return exec.Command("legendary", "install", gameID, "--base-path", installPath, "-y")
	})
	dlManager.RegisterStore("gog", func(gameID, installPath string) *exec.Cmd {
		return exec.Command("gogdl", "download", gameID, "--path", installPath)
	})
	dlManager.RegisterStore("amazon", func(gameID, installPath string) *exec.Cmd {
		return exec.Command("nile", "install", gameID, "--path", installPath)
	})

	return &Server{
		port:             port,
		db:               database,
		legendaryAdapter: legendaryAdapter,
		downloadManager:  dlManager,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()
	
	// Health check
	mux.HandleFunc("/health", s.healthHandler)
	
	// Games endpoints
	mux.HandleFunc("/api/games", s.gamesHandler)
	mux.HandleFunc("/api/games/sync", s.syncGamesHandler)
	mux.HandleFunc("/api/games/launch", s.launchGameHandler)
	mux.HandleFunc("/api/games/install", s.installGameHandler)
	mux.HandleFunc("/api/games/uninstall", s.uninstallGameHandler)
	
	// Store endpoints
	mux.HandleFunc("/api/stores/legendary/auth", s.legendaryAuthHandler)
	mux.HandleFunc("/api/stores/legendary/status", s.legendaryStatusHandler)
	mux.HandleFunc("/api/stores/status", s.allStoresStatusHandler)
	mux.HandleFunc("/api/stores/auth", s.storeAuthHandler)

	// Download manager endpoints
	mux.HandleFunc("/api/downloads", s.downloadsHandler)
	mux.HandleFunc("/api/downloads/pause", s.pauseDownloadHandler)
	mux.HandleFunc("/api/downloads/resume", s.resumeDownloadHandler)
	mux.HandleFunc("/api/downloads/cancel", s.cancelDownloadHandler)

	s.httpServer = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: s.corsMiddleware(mux),
	}

	log.Infof("Starting API server on port %d", s.port)
	return s.httpServer.ListenAndServe()
}

func (s *Server) Stop() error {
	if s.httpServer != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return s.httpServer.Shutdown(ctx)
	}
	return nil
}

// CORS middleware for Tauri frontend
func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

// Handlers

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"version": "0.1.0",
	})
}

func (s *Server) gamesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.getGamesHandler(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) getGamesHandler(w http.ResponseWriter, r *http.Request) {
	games, err := s.db.GetAllGames()
	if err != nil {
		log.Errorf("Failed to get games: %v", err)
		http.Error(w, "Failed to get games", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(games)
}

func (s *Server) syncGamesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Sync with Legendary (Epic Games)
	if s.legendaryAdapter.IsAuthenticated() {
		games, err := s.legendaryAdapter.ListGames()
		if err != nil {
			log.Errorf("Failed to sync Legendary games: %v", err)
		} else {
			// Update database
			for _, game := range games {
				// Check if game exists
				existingGame, err := s.db.GetGame(game.ID)
				if err != nil {
					// Game doesn't exist, create it
					if err := s.db.CreateGame(game); err != nil {
						log.Errorf("Failed to create game %s: %v", game.ID, err)
					}
				} else {
					// Game exists, update it
					existingGame.Installed = game.Installed
					existingGame.InstallPath = game.InstallPath
					if err := s.db.UpdateGame(existingGame); err != nil {
						log.Errorf("Failed to update game %s: %v", game.ID, err)
					}
				}
			}
			log.Infof("Synced %d games from Epic Games Store", len(games))
		}
	}

	// TODO: Sync GOGdl and Nile

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "synced",
	})
}

func (s *Server) launchGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		GameID string `json:"game_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	game, err := s.db.GetGame(req.GameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		return
	}

	// Start play session
	session, err := s.db.StartSession(game.ID)
	if err != nil {
		log.Errorf("Failed to start session: %v", err)
	}

	// Launch game based on store
	switch game.StoreID {
	case "epic":
		// Use Legendary to launch
		cmd, err := s.legendaryAdapter.LaunchGame(game.AppID, "")
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to launch game: %v", err), http.StatusInternalServerError)
			return
		}

		// Wait for game to finish in a goroutine
		go func() {
			cmd.Wait()
			if session != nil {
				s.db.EndSession(session.ID)
			}
			log.Infof("Game %s finished", game.Title)
		}()

	default:
		http.Error(w, "Store not supported yet", http.StatusNotImplemented)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "launched",
		"game_id": game.ID,
	})
}

func (s *Server) legendaryAuthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := s.legendaryAdapter.Auth(); err != nil {
		http.Error(w, fmt.Sprintf("Authentication failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "authenticated",
	})
}

func (s *Server) legendaryStatusHandler(w http.ResponseWriter, r *http.Request) {
	authenticated := s.legendaryAdapter.IsAuthenticated()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"authenticated": authenticated,
	})
}

// Install game handler
func (s *Server) installGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		GameID      string `json:"game_id"`
		InstallPath string `json:"install_path,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	game, err := s.db.GetGame(req.GameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		return
	}

	// Queue download
	task, err := s.downloadManager.QueueDownload(game.AppID, game.Title, game.StoreID, req.InstallPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "queued",
		"task_id": task.ID,
	})
}

// Uninstall game handler
func (s *Server) uninstallGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		GameID string `json:"game_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	game, err := s.db.GetGame(req.GameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		return
	}

	// Uninstall based on store
	switch game.StoreID {
	case "epic":
		if err := s.legendaryAdapter.UninstallGame(game.AppID); err != nil {
			http.Error(w, fmt.Sprintf("Failed to uninstall: %v", err), http.StatusInternalServerError)
			return
		}
	default:
		http.Error(w, "Uninstall not supported for this store yet", http.StatusNotImplemented)
		return
	}

	// Update database
	game.Installed = false
	game.InstallPath = ""
	s.db.UpdateGame(game)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "uninstalled",
		"game_id": game.ID,
	})
}

// All stores status handler
func (s *Server) allStoresStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Build status from available adapters
	stores := []map[string]interface{}{
		{
			"store_id":      "epic",
			"name":          "Epic Games Store",
			"authenticated": s.legendaryAdapter.IsAuthenticated(),
		},
	}

	// TODO: Add GOG and Amazon status when those adapters are integrated

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stores)
}

// Store auth handler
func (s *Server) storeAuthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		StoreID string `json:"store_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	switch req.StoreID {
	case "epic":
		if err := s.legendaryAdapter.Auth(); err != nil {
			http.Error(w, fmt.Sprintf("Authentication failed: %v", err), http.StatusInternalServerError)
			return
		}
	default:
		http.Error(w, "Store not supported", http.StatusNotImplemented)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "authenticated",
	})
}

// Downloads list handler
func (s *Server) downloadsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tasks := s.downloadManager.GetAllTasks()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// Pause download handler
func (s *Server) pauseDownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID string `json:"task_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := s.downloadManager.PauseTask(req.TaskID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "paused",
	})
}

// Resume download handler
func (s *Server) resumeDownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID string `json:"task_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := s.downloadManager.ResumeTask(req.TaskID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "resumed",
	})
}

// Cancel download handler
func (s *Server) cancelDownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID string `json:"task_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := s.downloadManager.CancelTask(req.TaskID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "cancelled",
	})
}
