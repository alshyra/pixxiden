package config

import (
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

type Config struct {
	DatabasePath string     `mapstructure:"database_path"`
	API          APIConfig  `mapstructure:"api"`
	Stores       StoresConfig `mapstructure:"stores"`
	Runners      RunnersConfig `mapstructure:"runners"`
	Paths        PathsConfig  `mapstructure:"paths"`
}

type APIConfig struct {
	Port int `mapstructure:"port"`
}

type StoresConfig struct {
	Legendary LegendaryConfig `mapstructure:"legendary"`
	GOGdl     GOGdlConfig     `mapstructure:"gogdl"`
	Nile      NileConfig      `mapstructure:"nile"`
}

type LegendaryConfig struct {
	Enabled    bool   `mapstructure:"enabled"`
	BinaryPath string `mapstructure:"binary_path"`
	ConfigPath string `mapstructure:"config_path"`
}

type GOGdlConfig struct {
	Enabled    bool   `mapstructure:"enabled"`
	BinaryPath string `mapstructure:"binary_path"`
	ConfigPath string `mapstructure:"config_path"`
}

type NileConfig struct {
	Enabled    bool   `mapstructure:"enabled"`
	BinaryPath string `mapstructure:"binary_path"`
	ConfigPath string `mapstructure:"config_path"`
}

type RunnersConfig struct {
	WineGE   RunnerConfig `mapstructure:"wine_ge"`
	ProtonGE RunnerConfig `mapstructure:"proton_ge"`
}

type RunnerConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Path    string `mapstructure:"path"`
}

type PathsConfig struct {
	Library   string `mapstructure:"library"`
	Downloads string `mapstructure:"downloads"`
	Prefixes  string `mapstructure:"prefixes"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	
	// Config path
	homeDir, _ := os.UserHomeDir()
	configDir := filepath.Join(homeDir, ".config", "pixiden")
	
	// Create config dir if not exists
	os.MkdirAll(configDir, 0755)
	
	viper.AddConfigPath(configDir)
	viper.AddConfigPath(".")

	// Set defaults
	setDefaults(homeDir)

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found, create default
			if err := createDefaultConfig(configDir); err != nil {
				return nil, err
			}
			viper.ReadInConfig()
		} else {
			return nil, err
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}

func setDefaults(homeDir string) {
	// Database
	viper.SetDefault("database_path", filepath.Join(homeDir, ".local/share/pixiden/pixiden.db"))

	// API
	viper.SetDefault("api.port", 9090)

	// Stores
	viper.SetDefault("stores.legendary.enabled", true)
	viper.SetDefault("stores.legendary.binary_path", "/usr/bin/legendary")
	viper.SetDefault("stores.legendary.config_path", filepath.Join(homeDir, ".config/legendary"))

	viper.SetDefault("stores.gogdl.enabled", true)
	viper.SetDefault("stores.gogdl.binary_path", "/usr/bin/gogdl")
	viper.SetDefault("stores.gogdl.config_path", filepath.Join(homeDir, ".config/gogdl"))

	viper.SetDefault("stores.nile.enabled", false)
	viper.SetDefault("stores.nile.binary_path", "/usr/bin/nile")
	viper.SetDefault("stores.nile.config_path", filepath.Join(homeDir, ".config/nile"))

	// Runners
	viper.SetDefault("runners.wine_ge.enabled", true)
	viper.SetDefault("runners.wine_ge.path", filepath.Join(homeDir, ".local/share/wine-ge/wine-ge-9.0"))

	viper.SetDefault("runners.proton_ge.enabled", false)
	viper.SetDefault("runners.proton_ge.path", filepath.Join(homeDir, ".local/share/proton-ge/Proton-GE-9.15"))

	// Paths
	viper.SetDefault("paths.library", filepath.Join(homeDir, ".local/share/pixiden/games"))
	viper.SetDefault("paths.downloads", filepath.Join(homeDir, "Games"))
	viper.SetDefault("paths.prefixes", filepath.Join(homeDir, ".local/share/pixiden/prefixes"))
}

func createDefaultConfig(configDir string) error {
	configPath := filepath.Join(configDir, "config.yaml")
	
	defaultConfig := `# PixiDen Configuration

# API Settings
api:
  port: 9090

# Store Configuration
stores:
  legendary:
    enabled: true
    binary_path: /usr/bin/legendary
  gogdl:
    enabled: true
    binary_path: /usr/bin/gogdl
  nile:
    enabled: false
    binary_path: /usr/bin/nile

# Runner Configuration
runners:
  wine_ge:
    enabled: true
  proton_ge:
    enabled: false

# Paths
paths:
  library: ~/.local/share/pixiden/games
  downloads: ~/Games
  prefixes: ~/.local/share/pixiden/prefixes
`

	return os.WriteFile(configPath, []byte(defaultConfig), 0644)
}
