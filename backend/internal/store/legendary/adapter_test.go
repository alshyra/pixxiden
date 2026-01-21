package legendary

import (
	"testing"
)

// Mock pour les tests
type MockLegendaryCLI struct {
	ListGamesOutput []byte
	ListGamesError  error
	AuthError       error
}

func TestNewAdapter(t *testing.T) {
	adapter := NewAdapter("/usr/bin/legendary", "/home/user/.config/legendary")
	
	if adapter == nil {
		t.Fatal("Expected adapter to be created")
	}
	
	if adapter.binaryPath != "/usr/bin/legendary" {
		t.Errorf("Expected binaryPath to be /usr/bin/legendary, got %s", adapter.binaryPath)
	}
}

func TestListGames_EmptyLibrary(t *testing.T) {
	// Test avec une bibliothèque vide
	// Note: Ce test nécessite un mock du CLI
	// Pour l'instant, c'est un placeholder
	
	t.Skip("Skipping integration test - requires Legendary CLI mock")
}

func TestListGames_WithGames(t *testing.T) {
	// Test avec des jeux dans la bibliothèque
	// Nécessite un mock du JSON retourné par Legendary
	
	t.Skip("Skipping integration test - requires Legendary CLI mock")
}

func TestAuth_Success(t *testing.T) {
	// Test authentification réussie
	
	t.Skip("Skipping integration test - requires user interaction")
}

func TestIsAuthenticated(t *testing.T) {
	adapter := NewAdapter("/usr/bin/legendary", "/tmp/legendary-test")
	
	// Ce test nécessite un mock ou un environnement de test
	// Pour l'instant on vérifie juste que la méthode ne panic pas
	
	authenticated := adapter.IsAuthenticated()
	
	// Dans un environnement sans Legendary installé, devrait retourner false
	if authenticated {
		t.Log("Legendary is installed and authenticated")
	} else {
		t.Log("Legendary not installed or not authenticated")
	}
}

// TODO: Ajouter des tests avec mocks complets
// - TestInstallGame
// - TestUninstallGame
// - TestLaunchGame
// - TestGetGameInfo
// - TestSync

// Example de structure pour les tests avec mocks:
/*
func TestListGames_WithMock(t *testing.T) {
	mockJSON := `[
		{
			"app_name": "fortnite",
			"title": "Fortnite",
			"developer": "Epic Games",
			"is_installed": true
		}
	]`
	
	// Setup mock adapter
	// ...
	
	games, err := adapter.ListGames()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	
	if len(games) != 1 {
		t.Errorf("Expected 1 game, got %d", len(games))
	}
	
	if games[0].Title != "Fortnite" {
		t.Errorf("Expected game title 'Fortnite', got '%s'", games[0].Title)
	}
}
*/
