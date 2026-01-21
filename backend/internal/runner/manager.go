package runner

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type RunnerType string

const (
	RunnerTypeWine   RunnerType = "wine"
	RunnerTypeProton RunnerType = "proton"
	RunnerTypeNative RunnerType = "native"
)

type Runner struct {
	Type       RunnerType
	Name       string
	Version    string
	Path       string
	PrefixPath string
}

type Manager struct {
	runners       map[string]*Runner
	prefixesPath  string
}

func NewManager(prefixesPath string) *Manager {
	return &Manager{
		runners:      make(map[string]*Runner),
		prefixesPath: prefixesPath,
	}
}

// DetectRunners scans for available Wine/Proton installations
func (m *Manager) DetectRunners() error {
	homeDir, _ := os.UserHomeDir()
	
	// Common Wine-GE locations
	wineGEPaths := []string{
		filepath.Join(homeDir, ".local/share/wine-ge"),
		"/opt/wine-ge",
	}
	
	for _, basePath := range wineGEPaths {
		if entries, err := os.ReadDir(basePath); err == nil {
			for _, entry := range entries {
				if entry.IsDir() {
					runnerPath := filepath.Join(basePath, entry.Name())
					wineBin := filepath.Join(runnerPath, "bin", "wine")
					
					if _, err := os.Stat(wineBin); err == nil {
						runner := &Runner{
							Type:    RunnerTypeWine,
							Name:    entry.Name(),
							Version: entry.Name(), // Extract version from name
							Path:    runnerPath,
						}
						m.runners[entry.Name()] = runner
					}
				}
			}
		}
	}
	
	// Common Proton-GE locations
	protonGEPaths := []string{
		filepath.Join(homeDir, ".local/share/proton-ge"),
		filepath.Join(homeDir, ".local/share/Steam/compatibilitytools.d"),
	}
	
	for _, basePath := range protonGEPaths {
		if entries, err := os.ReadDir(basePath); err == nil {
			for _, entry := range entries {
				if entry.IsDir() {
					runnerPath := filepath.Join(basePath, entry.Name())
					protonBin := filepath.Join(runnerPath, "proton")
					
					if _, err := os.Stat(protonBin); err == nil {
						runner := &Runner{
							Type:    RunnerTypeProton,
							Name:    entry.Name(),
							Version: entry.Name(),
							Path:    runnerPath,
						}
						m.runners[entry.Name()] = runner
					}
				}
			}
		}
	}
	
	return nil
}

// GetRunner returns a specific runner by name
func (m *Manager) GetRunner(name string) (*Runner, error) {
	runner, ok := m.runners[name]
	if !ok {
		return nil, fmt.Errorf("runner %s not found", name)
	}
	return runner, nil
}

// GetDefaultRunner returns the first available runner
func (m *Manager) GetDefaultRunner() (*Runner, error) {
	// Prefer Wine-GE
	for _, runner := range m.runners {
		if runner.Type == RunnerTypeWine {
			return runner, nil
		}
	}
	
	// Fallback to Proton
	for _, runner := range m.runners {
		if runner.Type == RunnerTypeProton {
			return runner, nil
		}
	}
	
	return nil, fmt.Errorf("no runners available")
}

// GetAllRunners returns all available runners
func (m *Manager) GetAllRunners() []*Runner {
	runners := make([]*Runner, 0, len(m.runners))
	for _, runner := range m.runners {
		runners = append(runners, runner)
	}
	return runners
}

// CreatePrefix creates a Wine prefix for a game
func (m *Manager) CreatePrefix(gameID string) (string, error) {
	prefixPath := filepath.Join(m.prefixesPath, gameID)
	
	if err := os.MkdirAll(prefixPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create prefix: %w", err)
	}
	
	return prefixPath, nil
}

// LaunchWithWine launches a game with Wine
func (m *Manager) LaunchWithWine(runner *Runner, executablePath string, gameID string) (*exec.Cmd, error) {
	// Create prefix if not exists
	prefixPath, err := m.CreatePrefix(gameID)
	if err != nil {
		return nil, err
	}
	
	wineBin := filepath.Join(runner.Path, "bin", "wine")
	
	cmd := exec.Command(wineBin, executablePath)
	cmd.Env = append(os.Environ(),
		"WINEPREFIX="+prefixPath,
		"WINEDEBUG=-all", // Disable debug output
	)
	cmd.Dir = filepath.Dir(executablePath)
	
	return cmd, nil
}

// LaunchWithProton launches a game with Proton
func (m *Manager) LaunchWithProton(runner *Runner, executablePath string, gameID string) (*exec.Cmd, error) {
	// Create prefix if not exists
	prefixPath, err := m.CreatePrefix(gameID)
	if err != nil {
		return nil, err
	}
	
	protonBin := filepath.Join(runner.Path, "proton")
	
	cmd := exec.Command(protonBin, "run", executablePath)
	cmd.Env = append(os.Environ(),
		"STEAM_COMPAT_DATA_PATH="+prefixPath,
		"STEAM_COMPAT_CLIENT_INSTALL_PATH="+filepath.Dir(runner.Path),
		"PROTON_USE_WINED3D=0",    // Use DXVK
		"PROTON_ENABLE_NVAPI=1",   // Enable NVIDIA API
	)
	cmd.Dir = filepath.Dir(executablePath)
	
	return cmd, nil
}

// LaunchNative launches a native Linux game
func (m *Manager) LaunchNative(executablePath string) (*exec.Cmd, error) {
	cmd := exec.Command(executablePath)
	cmd.Dir = filepath.Dir(executablePath)
	
	return cmd, nil
}

// GetWrapperCommand returns the wrapper command for use with Legendary
func (m *Manager) GetWrapperCommand(runner *Runner, gameID string) (string, error) {
	prefixPath, err := m.CreatePrefix(gameID)
	if err != nil {
		return "", err
	}
	
	switch runner.Type {
	case RunnerTypeWine:
		wineBin := filepath.Join(runner.Path, "bin", "wine")
		return fmt.Sprintf("WINEPREFIX=%s %s", prefixPath, wineBin), nil
		
	case RunnerTypeProton:
		protonBin := filepath.Join(runner.Path, "proton")
		return fmt.Sprintf("STEAM_COMPAT_DATA_PATH=%s %s run", prefixPath, protonBin), nil
		
	default:
		return "", fmt.Errorf("unsupported runner type: %s", runner.Type)
	}
}
