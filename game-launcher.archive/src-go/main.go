package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

// Structures de données
type Game struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Executable  string `json:"executable"`
	ProcessName string `json:"process_name,omitempty"` // Nom du processus réel (ex: Naheulbeuk.exe)
	Source      string `json:"source,omitempty"`
	Platform    string `json:"platform,omitempty"`
	CoverURL    string `json:"cover_url,omitempty"`
	Installed   bool   `json:"installed"`
}

type Message struct {
	Type     string                 `json:"type"`
	GameID   string                 `json:"game_id,omitempty"`
	Games    []Game                 `json:"games,omitempty"`
	Status   string                 `json:"status,omitempty"`
	Error    string                 `json:"error,omitempty"`
	GameInfo map[string]interface{} `json:"game_info,omitempty"`
}

// Configuration WebSocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Accepter toutes les origines (dev seulement)
	},
}

// Gestion des connexions actives
type SafeConn struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

type ConnectionManager struct {
	connections map[*SafeConn]bool
	mu          sync.Mutex
}

func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		connections: make(map[*SafeConn]bool),
	}
}

func (cm *ConnectionManager) Add(conn *websocket.Conn) *SafeConn {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	safeConn := &SafeConn{conn: conn}
	cm.connections[safeConn] = true
	log.Printf("✅ Nouvelle connexion (total: %d)", len(cm.connections))
	return safeConn
}

func (cm *ConnectionManager) Remove(sc *SafeConn) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	delete(cm.connections, sc)
	log.Printf("🔌 Connexion fermée (total: %d)", len(cm.connections))
}

var connManager = NewConnectionManager()
var processManager = NewProcessManager()
var gamepadListener *GamepadListener

// handleHomeButton est appelé quand le bouton PS/Home est pressé (globalement)
func handleHomeButton() {
	log.Println("🏠 Traitement du bouton Home")
	
	// Broadcast l'événement à tous les clients WebSocket
	connManager.mu.Lock()
	for safeConn := range connManager.connections {
		safeConn.mu.Lock()
		safeConn.conn.WriteJSON(Message{
			Type: "home_button_pressed",
		})
		safeConn.mu.Unlock()
	}
	connManager.mu.Unlock()
}

// Fonction pour obtenir les jeux (maintenant depuis Heroic + Steam)
func getGames() []Game {
	extendedGames := GetAllGames()
	
	// Convertir au format avec covers pour le WebSocket
	var games []Game
	for _, eg := range extendedGames {
		coverURL := ""
		// Convertir file:// en URL HTTP pour le frontend
		if strings.HasPrefix(eg.CoverURL, "file://") {
			// Extraire le chemin du fichier et créer une URL via notre serveur
			filePath := strings.TrimPrefix(eg.CoverURL, "file://")
			coverURL = "http://localhost:8080/cover?path=" + filePath
		}
		games = append(games, Game{
			ID:          eg.ID,
			Title:       eg.Title,
			Executable:  eg.Executable,
			ProcessName: eg.ProcessName,
			Source:      string(eg.Source),
			Platform:    string(eg.Platform),
			CoverURL:    coverURL,
			Installed:   eg.Installed,
		})
	}
	
	// Si aucun jeu trouvé, retourner des jeux fictifs pour la démo
	if len(games) == 0 {
		log.Println("⚠️  Aucun jeu trouvé, utilisation des jeux fictifs")
		return getFallbackGames()
	}
	
	return games
}

// getFallbackGames retourne des jeux fictifs si aucun jeu réel n'est trouvé
func getFallbackGames() []Game {
	return []Game{
		{ID: "demo_1", Title: "[DEMO] Half-Life 2", Executable: "echo 'Demo game'"},
		{ID: "demo_2", Title: "[DEMO] Portal", Executable: "echo 'Demo game'"},
		{ID: "demo_3", Title: "[DEMO] Counter-Strike", Executable: "echo 'Demo game'"},
		{ID: "demo_4", Title: "[DEMO] Team Fortress 2", Executable: "echo 'Demo game'"},
		{ID: "demo_5", Title: "[DEMO] Left 4 Dead", Executable: "echo 'Demo game'"},
		{ID: "demo_6", Title: "[DEMO] Dota 2", Executable: "echo 'Demo game'"},
		{ID: "demo_7", Title: "[DEMO] Cyberpunk 2077", Executable: "echo 'Demo game'"},
		{ID: "demo_8", Title: "[DEMO] The Witcher 3", Executable: "echo 'Demo game'"},
		{ID: "demo_9", Title: "[DEMO] Elden Ring", Executable: "echo 'Demo game'"},
		{ID: "demo_10", Title: "[DEMO] Baldur's Gate 3", Executable: "echo 'Demo game'"},
		{ID: "demo_11", Title: "[DEMO] Starfield", Executable: "echo 'Demo game'"},
		{ID: "demo_12", Title: "[DEMO] God of War", Executable: "echo 'Demo game'"},
	}
}

// Handler WebSocket
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ Erreur upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	safeConn := connManager.Add(conn)
	defer connManager.Remove(safeConn)

	// Envoyer la liste des jeux immédiatement
	games := getGames()
	response := Message{
		Type:  "game_list",
		Games: games,
	}

	safeConn.mu.Lock()
	err = conn.WriteJSON(response)
	safeConn.mu.Unlock()
	
	if err != nil {
		log.Printf("❌ Erreur envoi liste: %v", err)
		return
	}

	log.Printf("📦 Liste de %d jeux envoyée", len(games))

	// Boucle d'écoute des messages
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ Erreur lecture: %v", err)
			}
			break
		}

		log.Printf("📨 Message reçu: %s (game_id: %s)", msg.Type, msg.GameID)

		// Traitement des messages
		switch msg.Type {
		case "launch_game":
			handleLaunchGame(safeConn, msg.GameID)
		case "get_game_status":
			handleGetGameStatus(safeConn)
		case "return_to_launcher":
			handleReturnToLauncher(safeConn)
		case "stop_game":
			handleStopGame(safeConn)
		default:
			log.Printf("⚠️  Type de message inconnu: %s", msg.Type)
		}
	}
}

// Fonction pour lancer un jeu
func handleLaunchGame(safeConn *SafeConn, gameID string) {
	games := getGames()
	var selectedGame *Game

	// Trouver le jeu
	for _, game := range games {
		if game.ID == gameID {
			selectedGame = &game
			break
		}
	}

	if selectedGame == nil {
		response := Message{
			Type:   "launch_result",
			GameID: gameID,
			Status: "error",
			Error:  "Jeu non trouvé",
		}
		safeConn.mu.Lock()
		safeConn.conn.WriteJSON(response)
		safeConn.mu.Unlock()
		return
	}

	log.Printf("🚀 Demande de lancement: %s (%s)", selectedGame.Title, selectedGame.Executable)
	if selectedGame.ProcessName != "" {
		log.Printf("📝 Processus attendu: %s", selectedGame.ProcessName)
	}

	// Lancer via le ProcessManager
	err := processManager.LaunchGame(gameID, selectedGame.Title, selectedGame.Executable, selectedGame.ProcessName)

	response := Message{
		Type:   "launch_result",
		GameID: gameID,
	}

	if err != nil {
		response.Status = "error"
		response.Error = err.Error()
		log.Printf("❌ Échec du lancement: %v", err)
	} else {
		response.Status = "success"
		log.Printf("✅ Jeu lancé: %s", selectedGame.Title)
	}

	safeConn.mu.Lock()
	safeConn.conn.WriteJSON(response)
	safeConn.mu.Unlock()
}

// Handler pour obtenir le statut du jeu en cours
func handleGetGameStatus(safeConn *SafeConn) {
	status := processManager.GetGameStatus()
	
	response := Message{
		Type:     "game_status",
		GameInfo: status,
	}
	
	safeConn.mu.Lock()
	safeConn.conn.WriteJSON(response)
	safeConn.mu.Unlock()
}

// Handler pour revenir au launcher (bouton Home/PS)
func handleReturnToLauncher(safeConn *SafeConn) {
	log.Printf("🏠 Demande de retour au launcher")
	
	// On notifie juste le frontend, c'est Tauri qui gère le focus
	response := Message{
		Type:   "return_to_launcher_ack",
		Status: "success",
	}
	
	safeConn.mu.Lock()
	safeConn.conn.WriteJSON(response)
	safeConn.mu.Unlock()
}

// Handler pour arrêter le jeu en cours
func handleStopGame(safeConn *SafeConn) {
	log.Printf("🛑 Demande d'arrêt du jeu")
	
	err := processManager.StopGame()
	
	response := Message{
		Type: "stop_game_result",
	}
	
	if err != nil {
		response.Status = "error"
		response.Error = err.Error()
	} else {
		response.Status = "success"
	}
	
	safeConn.mu.Lock()
	safeConn.conn.WriteJSON(response)
	safeConn.mu.Unlock()
}

// Handler de health check
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"version": "1.0.0",
	})
}

// Handler pour servir les covers de jeux
func handleCover(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "path parameter required", http.StatusBadRequest)
		return
	}
	
	// Vérifier que le chemin est dans les dossiers autorisés (sécurité)
	homeDir, _ := os.UserHomeDir()
	allowedPaths := []string{
		filepath.Join(homeDir, ".config", "heroic"),
		filepath.Join(homeDir, ".local", "share", "Steam"),
	}
	
	allowed := false
	for _, ap := range allowedPaths {
		if strings.HasPrefix(path, ap) {
			allowed = true
			break
		}
	}
	
	if !allowed {
		http.Error(w, "access denied", http.StatusForbidden)
		return
	}
	
	// Vérifier que le fichier existe
	if _, err := os.Stat(path); os.IsNotExist(err) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	
	// Définir le Content-Type selon l'extension
	ext := strings.ToLower(filepath.Ext(path))
	contentType := "image/jpeg"
	switch ext {
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".gif":
		contentType = "image/gif"
	}
	
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	
	http.ServeFile(w, r, path)
}

func main() {
	// Configuration du serveur
	port := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	// Démarrer l'écoute globale du gamepad
	gamepadListener = NewGamepadListener(handleHomeButton)
	log.Println("🎮 Démarrage de l'écoute globale du gamepad...")
	if err := gamepadListener.Start(); err != nil {
		log.Printf("⚠️ Impossible de démarrer l'écoute gamepad: %v", err)
		log.Println("   Pour activer l'écoute globale, ajoutez votre utilisateur au groupe 'input':")
		log.Println("   sudo usermod -a -G input $USER")
		log.Println("   Puis déconnectez-vous et reconnectez-vous.")
	} else {
		log.Println("✅ Écoute gamepad démarrée avec succès")
	}

	// Configurer les callbacks du ProcessManager
	processManager.SetCallbacks(
		// onGameStart
		func(gameID string) {
			log.Printf("📢 Notification: Jeu démarré - %s", gameID)
			broadcastGameEvent("game_started", gameID)
		},
		// onGameEnd
		func(gameID string, status ProcessStatus) {
			log.Printf("📢 Notification: Jeu terminé - %s (status: %s)", gameID, status)
			broadcastGameEvent("game_ended", gameID)
		},
	)

	// Routes
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/cover", handleCover)

	// Démarrage du serveur
	addr := fmt.Sprintf("localhost:%s", port)
	log.Printf("🚀 Backend Go démarré sur %s", addr)
	log.Printf("📡 WebSocket disponible sur ws://%s/ws", addr)

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("❌ Erreur serveur: %v", err)
	}
}

// broadcastGameEvent envoie un événement de jeu à tous les clients connectés
func broadcastGameEvent(eventType, gameID string) {
	connManager.mu.Lock()
	defer connManager.mu.Unlock()

	message := Message{
		Type:   eventType,
		GameID: gameID,
	}

	for safeConn := range connManager.connections {
		safeConn.mu.Lock()
		if err := safeConn.conn.WriteJSON(message); err != nil {
			log.Printf("⚠️  Erreur broadcast vers client: %v", err)
		}
		safeConn.mu.Unlock()
	}
}
