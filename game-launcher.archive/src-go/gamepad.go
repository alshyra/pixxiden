package main

import (
	"encoding/binary"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// InputEvent représente un événement Linux input
type InputEvent struct {
	Time  [2]int64 // timeval: sec, usec
	Type  uint16
	Code  uint16
	Value int32
}

// Constantes pour les types d'événements
const (
	EV_KEY = 0x01
	EV_ABS = 0x03
)

// Codes des boutons PS4/PS5 (peuvent varier selon le driver)
const (
	BTN_SOUTH    = 0x130 // X sur PS (A sur Xbox)
	BTN_EAST     = 0x131 // O sur PS (B sur Xbox)
	BTN_NORTH    = 0x133 // Triangle sur PS (Y sur Xbox)
	BTN_WEST     = 0x134 // Carré sur PS (X sur Xbox)
	BTN_TL       = 0x136 // L1
	BTN_TR       = 0x137 // R1
	BTN_TL2      = 0x138 // L2
	BTN_TR2      = 0x139 // R2
	BTN_SELECT   = 0x13a // Share/Select
	BTN_START    = 0x13b // Options/Start
	BTN_MODE     = 0x13c // PS Button / Home
	BTN_THUMBL   = 0x13d // L3
	BTN_THUMBR   = 0x13e // R3
)

// GamepadListener écoute les événements gamepad au niveau système
type GamepadListener struct {
	devicePath   string
	file         *os.File
	running      bool
	mu           sync.Mutex
	onHomeButton func()
}

// NewGamepadListener crée un nouveau listener pour le gamepad
func NewGamepadListener(onHomeButton func()) *GamepadListener {
	return &GamepadListener{
		onHomeButton: onHomeButton,
	}
}

// findGamepadDevice trouve le périphérique du gamepad
func (gl *GamepadListener) findGamepadDevice() (string, error) {
	// Lire /proc/bus/input/devices pour trouver le gamepad
	data, err := os.ReadFile("/proc/bus/input/devices")
	if err != nil {
		return "", fmt.Errorf("impossible de lire les périphériques: %w", err)
	}

	content := string(data)
	lines := strings.Split(content, "\n")
	
	var currentName string
	var currentHandlers string
	
	for _, line := range lines {
		if strings.HasPrefix(line, "N: Name=") {
			currentName = strings.Trim(strings.TrimPrefix(line, "N: Name="), "\"")
		} else if strings.HasPrefix(line, "H: Handlers=") {
			currentHandlers = strings.TrimPrefix(line, "H: Handlers=")
			
			// Chercher un gamepad (PlayStation, Xbox, etc.)
			isGamepad := strings.Contains(strings.ToLower(currentName), "controller") ||
				strings.Contains(strings.ToLower(currentName), "gamepad") ||
				strings.Contains(strings.ToLower(currentName), "wireless controller")
			
			// Ignorer les motion sensors et touchpad
			isNotGamepad := strings.Contains(strings.ToLower(currentName), "motion") ||
				strings.Contains(strings.ToLower(currentName), "touchpad") ||
				strings.Contains(strings.ToLower(currentName), "led")
			
			if isGamepad && !isNotGamepad {
				// Trouver l'eventX dans les handlers
				for _, handler := range strings.Fields(currentHandlers) {
					if strings.HasPrefix(handler, "event") {
						devicePath := filepath.Join("/dev/input", handler)
						log.Printf("🎮 Gamepad trouvé: %s -> %s", currentName, devicePath)
						return devicePath, nil
					}
				}
			}
		}
	}
	
	return "", fmt.Errorf("aucun gamepad trouvé")
}

// Start démarre l'écoute des événements gamepad
func (gl *GamepadListener) Start() error {
	gl.mu.Lock()
	if gl.running {
		gl.mu.Unlock()
		return nil
	}
	gl.mu.Unlock()

	// Trouver le périphérique du gamepad
	devicePath, err := gl.findGamepadDevice()
	if err != nil {
		return fmt.Errorf("impossible de trouver le gamepad: %w", err)
	}
	gl.devicePath = devicePath

	// Ouvrir le périphérique
	file, err := os.Open(devicePath)
	if err != nil {
		return fmt.Errorf("impossible d'ouvrir %s: %w (vérifiez les permissions, ajoutez l'utilisateur au groupe 'input')", devicePath, err)
	}
	gl.file = file

	gl.mu.Lock()
	gl.running = true
	gl.mu.Unlock()

	log.Printf("🎮 Écoute globale du gamepad démarrée sur %s", devicePath)

	// Lancer la goroutine de lecture
	go gl.readLoop()

	return nil
}

// Stop arrête l'écoute
func (gl *GamepadListener) Stop() {
	gl.mu.Lock()
	defer gl.mu.Unlock()

	if !gl.running {
		return
	}

	gl.running = false
	if gl.file != nil {
		gl.file.Close()
	}
	log.Println("🎮 Écoute globale du gamepad arrêtée")
}

// readLoop lit les événements en boucle
func (gl *GamepadListener) readLoop() {
	event := InputEvent{}
	eventSize := binary.Size(event)
	buf := make([]byte, eventSize)

	// Anti-rebond pour le bouton Home
	var lastHomePress time.Time
	debounceDelay := 300 * time.Millisecond

	for {
		gl.mu.Lock()
		running := gl.running
		gl.mu.Unlock()

		if !running {
			return
		}

		// Lire un événement
		n, err := gl.file.Read(buf)
		if err != nil {
			log.Printf("⚠️ Erreur lecture gamepad: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		if n != eventSize {
			continue
		}

		// Parser l'événement
		event.Type = binary.LittleEndian.Uint16(buf[16:18])
		event.Code = binary.LittleEndian.Uint16(buf[18:20])
		event.Value = int32(binary.LittleEndian.Uint32(buf[20:24]))

		// On ne s'intéresse qu'aux événements de type KEY (boutons)
		if event.Type != EV_KEY {
			continue
		}

		// Bouton pressé (Value = 1)
		if event.Value == 1 {
			switch event.Code {
			case BTN_MODE:
				// Bouton PS/Home pressé
				if time.Since(lastHomePress) > debounceDelay {
					lastHomePress = time.Now()
					log.Println("🏠 Bouton PS/Home détecté (global)")
					if gl.onHomeButton != nil {
						go gl.onHomeButton()
					}
				}
			}
		}
	}
}
