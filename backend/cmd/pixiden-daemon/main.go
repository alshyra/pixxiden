package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/yourusername/pixiden/internal/api"
	"github.com/yourusername/pixiden/internal/config"
	"github.com/yourusername/pixiden/internal/db"
	"github.com/yourusername/pixiden/internal/store/legendary"

	log "github.com/sirupsen/logrus"
)

const (
	version = "0.1.0"
)

func main() {
	// Setup logging
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp: true,
	})
	log.SetLevel(log.InfoLevel)

	log.Infof("Starting PixiDen Daemon v%s", version)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	database, err := db.NewDatabase(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	log.Info("Database initialized successfully")

	// Initialize store adapters
	legendaryAdapter := legendary.NewAdapter(cfg.Stores.Legendary.BinaryPath, cfg.Stores.Legendary.ConfigPath)
	log.Info("Legendary adapter initialized")

	// TODO: Initialize GOGdl and Nile adapters

	// Start API server
	apiServer := api.NewServer(cfg.API.Port, database, legendaryAdapter)
	
	go func() {
		if err := apiServer.Start(); err != nil {
			log.Fatalf("API server error: %v", err)
		}
	}()

	log.Infof("API server started on port %d", cfg.API.Port)

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	
	<-sigChan
	
	log.Info("Shutting down gracefully...")
	apiServer.Stop()
	
	fmt.Println("PixiDen daemon stopped")
}
