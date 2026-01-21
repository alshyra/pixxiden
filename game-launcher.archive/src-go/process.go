package main

import (
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"
)

// GameProcess représente un jeu en cours d'exécution
type GameProcess struct {
	GameID      string
	Title       string
	ProcessName string // Nom du processus réel (ex: Naheulbeuk.exe)
	Cmd         *exec.Cmd
	PID         int
	StartTime   time.Time
	Status      ProcessStatus
	IsLauncher  bool // true si lancé via xdg-open
	mu          sync.Mutex
}

// ProcessStatus représente l'état d'un processus
type ProcessStatus string

const (
	StatusLaunching ProcessStatus = "launching"
	StatusRunning   ProcessStatus = "running"
	StatusStopped   ProcessStatus = "stopped"
	StatusCrashed   ProcessStatus = "crashed"
)

// ProcessManager gère les processus de jeux
type ProcessManager struct {
	currentGame *GameProcess
	mu          sync.Mutex
	onGameStart func(gameID string)
	onGameEnd   func(gameID string, status ProcessStatus)
}

// NewProcessManager crée un nouveau gestionnaire de processus
func NewProcessManager() *ProcessManager {
	return &ProcessManager{
		currentGame: nil,
	}
}

// SetCallbacks définit les callbacks pour les événements
func (pm *ProcessManager) SetCallbacks(onStart func(string), onEnd func(string, ProcessStatus)) {
	pm.onGameStart = onStart
	pm.onGameEnd = onEnd
}

// LaunchGame lance un jeu et monitore son processus
func (pm *ProcessManager) LaunchGame(gameID, title, executable, processName string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Vérifier si un jeu est déjà en cours
	if pm.currentGame != nil && pm.currentGame.Status == StatusRunning {
		return fmt.Errorf("un jeu est déjà en cours: %s", pm.currentGame.Title)
	}

	log.Printf("🎮 Lancement de: %s", title)
	log.Printf("📝 Commande: %s", executable)
	if processName != "" {
		log.Printf("📝 Processus réel: %s", processName)
	}

	// Détecter si c'est un launcher (xdg-open, heroic://, steam://)
	isLauncher := strings.Contains(executable, "xdg-open") || 
		strings.Contains(executable, "heroic://") || 
		strings.Contains(executable, "steam://")

	// Parser la commande
	parts := strings.Fields(executable)
	if len(parts) == 0 {
		return fmt.Errorf("commande vide")
	}

	var cmd *exec.Cmd
	if len(parts) == 1 {
		cmd = exec.Command(parts[0])
	} else {
		cmd = exec.Command(parts[0], parts[1:]...)
	}

	// Créer un nouveau groupe de processus pour faciliter le nettoyage
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}

	// Lancer le processus
	if err := cmd.Start(); err != nil {
		log.Printf("❌ Erreur lancement: %v", err)
		return fmt.Errorf("échec du lancement: %w", err)
	}

	// Créer l'objet GameProcess
	gameProcess := &GameProcess{
		GameID:      gameID,
		Title:       title,
		ProcessName: processName,
		Cmd:         cmd,
		PID:         cmd.Process.Pid,
		StartTime:   time.Now(),
		Status:      StatusLaunching,
		IsLauncher:  isLauncher,
	}

	pm.currentGame = gameProcess

	log.Printf("✅ Processus lancé - PID: %d", gameProcess.PID)

	// Callback de démarrage
	if pm.onGameStart != nil {
		go pm.onGameStart(gameID)
	}

	if isLauncher {
		// Pour les launchers, on ne track pas le PID, on attend juste que le launcher se termine
		log.Printf("🔗 Launcher détecté, mode manuel de tracking")
		gameProcess.Status = StatusRunning
		
		// On considère le jeu en cours pendant un temps, l'utilisateur devra revenir manuellement
		go func() {
			cmd.Wait() // Attendre que xdg-open se termine (immédiat)
			log.Printf("🔗 Launcher terminé, jeu probablement démarré via %s", title)
			// Ne pas appeler onGameEnd ici, le jeu continue
		}()
		
		return nil // Important : ne pas monitorer le processus launcher
	}
	
	// Marquer comme "running" après 2 secondes (temps de lancement)
	go func() {
		time.Sleep(2 * time.Second)
		gameProcess.mu.Lock()
		if gameProcess.Status == StatusLaunching {
			gameProcess.Status = StatusRunning
			log.Printf("🎮 Jeu en cours: %s (PID: %d)", gameProcess.Title, gameProcess.PID)
		}
		gameProcess.mu.Unlock()
	}()

	// Monitorer le processus dans une goroutine
	go pm.monitorProcess(gameProcess)

	return nil
}

// monitorProcess surveille un processus de jeu
func (pm *ProcessManager) monitorProcess(gp *GameProcess) {
	// Attendre la fin du processus
	err := gp.Cmd.Wait()

	gp.mu.Lock()
	defer gp.mu.Unlock()

	duration := time.Since(gp.StartTime)
	log.Printf("🛑 Processus terminé: %s (durée: %s)", gp.Title, duration.Round(time.Second))

	// Déterminer le statut de fin
	finalStatus := StatusStopped
	if err != nil {
		log.Printf("⚠️  Code de sortie: %v", err)
		
		// Vérifier si c'est un crash (code de sortie non nul)
		if exitError, ok := err.(*exec.ExitError); ok {
			if exitError.ExitCode() != 0 {
				finalStatus = StatusCrashed
				log.Printf("💥 Crash détecté - Code: %d", exitError.ExitCode())
			}
		}
	}

	gp.Status = finalStatus

	// Callback de fin
	if pm.onGameEnd != nil {
		go pm.onGameEnd(gp.GameID, finalStatus)
	}

	// Nettoyer après un délai
	time.Sleep(1 * time.Second)
	pm.mu.Lock()
	if pm.currentGame != nil && pm.currentGame.GameID == gp.GameID {
		pm.currentGame = nil
	}
	pm.mu.Unlock()
}

// GetCurrentGame retourne le jeu actuellement en cours
func (pm *ProcessManager) GetCurrentGame() *GameProcess {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	return pm.currentGame
}

// IsGameRunning vérifie si un jeu est en cours
func (pm *ProcessManager) IsGameRunning() bool {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	return pm.currentGame != nil && 
		(pm.currentGame.Status == StatusRunning || pm.currentGame.Status == StatusLaunching)
}

// BringToFront tente de ramener le jeu au premier plan (optionnel, dépend du WM)
func (pm *ProcessManager) BringToFront() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if pm.currentGame == nil {
		return fmt.Errorf("aucun jeu en cours")
	}

	log.Printf("🔍 Tentative de ramener le jeu au premier plan (PID: %d)", pm.currentGame.PID)
	
	// Sur Linux, c'est complexe car ça dépend du window manager
	// On peut essayer avec wmctrl si disponible, mais ce n'est pas garanti
	// Pour l'instant, on logue juste l'intention
	
	return nil
}

// StopGame arrête proprement le jeu en cours
func (pm *ProcessManager) StopGame() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if pm.currentGame == nil {
		return fmt.Errorf("aucun jeu en cours")
	}

	log.Printf("🛑 Arrêt du jeu: %s", pm.currentGame.Title)
	gameID := pm.currentGame.GameID
	processName := pm.currentGame.ProcessName
	gameTitle := pm.currentGame.Title

	// Essayer de tuer les processus du jeu via pkill
	pm.killGameProcesses(processName, gameTitle)

	// Nettoyer l'état
	pm.currentGame.Status = StatusStopped
	pm.currentGame = nil

	// Notifier la fin
	if pm.onGameEnd != nil {
		go pm.onGameEnd(gameID, StatusStopped)
	}

	return nil
}

// killGameProcesses tente de tuer les processus liés au jeu
func (pm *ProcessManager) killGameProcesses(processName, gameTitle string) {
	// Si on a le nom du processus réel (ex: Naheulbeuk.exe), l'utiliser en priorité
	if processName != "" {
		log.Printf("🔍 Recherche du processus: %s", processName)
		
		// Enlever l'extension .exe pour pkill
		searchTerm := strings.TrimSuffix(processName, ".exe")
		searchTerm = strings.TrimSuffix(searchTerm, ".EXE")
		
		cmd := exec.Command("pkill", "-f", "-i", searchTerm)
		if err := cmd.Run(); err != nil {
			log.Printf("⚠️  pkill '%s' n'a pas trouvé de processus: %v", searchTerm, err)
		} else {
			log.Printf("✅ Processus '%s' arrêté via pkill", searchTerm)
			return
		}
	}
	
	// Fallback: extraire un mot significatif du titre
	words := strings.Fields(gameTitle)
	var searchTerm string
	
	// Chercher un mot significatif (pas "The", "A", "Of", etc.)
	stopWords := map[string]bool{"the": true, "a": true, "an": true, "of": true, "and": true}
	for _, word := range words {
		if len(word) > 3 && !stopWords[strings.ToLower(word)] {
			searchTerm = word
			break
		}
	}
	
	if searchTerm == "" && len(words) > 0 {
		searchTerm = words[0]
	}
	
	log.Printf("🔍 Fallback - Recherche de processus contenant: %s", searchTerm)
	
	// Essayer pkill avec le terme de recherche
	cmd := exec.Command("pkill", "-f", "-i", searchTerm)
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️  pkill n'a pas trouvé de processus correspondant: %v", err)
	} else {
		log.Printf("✅ Processus arrêtés via pkill")
	}
}

// GetGameStatus retourne le statut du jeu en cours
func (pm *ProcessManager) GetGameStatus() map[string]interface{} {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if pm.currentGame == nil {
		return map[string]interface{}{
			"running": false,
		}
	}

	pm.currentGame.mu.Lock()
	defer pm.currentGame.mu.Unlock()

	return map[string]interface{}{
		"running":   pm.IsGameRunning(),
		"game_id":   pm.currentGame.GameID,
		"title":     pm.currentGame.Title,
		"pid":       pm.currentGame.PID,
		"status":    string(pm.currentGame.Status),
		"duration":  time.Since(pm.currentGame.StartTime).Seconds(),
	}
}
