package db

import (
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Database struct {
	db *gorm.DB
}

// Game represents a game in the library
type Game struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	Title        string    `gorm:"index" json:"title"`
	StoreID      string    `gorm:"index" json:"store_id"` // epic, gog, amazon
	AppID        string    `json:"app_id"`                // ID in the store
	Installed    bool      `json:"installed"`
	InstallPath  string    `json:"install_path"`
	ExecutablePath string  `json:"executable_path"`
	Runner       string    `json:"runner"` // wine-ge-9.0, proton-ge-9.15, native
	PlayTime     int64     `json:"play_time"` // seconds
	LastPlayed   time.Time `json:"last_played"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Metadata represents game metadata
type Metadata struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	GameID      string `gorm:"index;unique" json:"game_id"`
	Description string `json:"description"`
	Developer   string `json:"developer"`
	Publisher   string `json:"publisher"`
	ReleaseDate string `json:"release_date"`
	Genres      string `json:"genres"` // JSON array as string
	CoverURL    string `json:"cover_url"`
	Screenshots string `json:"screenshots"` // JSON array as string
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PlaySession tracks game sessions
type PlaySession struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	GameID     string    `gorm:"index" json:"game_id"`
	StartTime  time.Time `json:"start_time"`
	EndTime    *time.Time `json:"end_time"`
	Duration   int64     `json:"duration"` // seconds
	CreatedAt  time.Time `json:"created_at"`
}

func NewDatabase(path string) (*Database, error) {
	// Create directory if not exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto migrate schemas
	if err := db.AutoMigrate(&Game{}, &Metadata{}, &PlaySession{}); err != nil {
		return nil, err
	}

	return &Database{db: db}, nil
}

func (d *Database) Close() error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Game operations

func (d *Database) CreateGame(game *Game) error {
	return d.db.Create(game).Error
}

func (d *Database) GetGame(id string) (*Game, error) {
	var game Game
	if err := d.db.First(&game, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &game, nil
}

func (d *Database) GetAllGames() ([]Game, error) {
	var games []Game
	if err := d.db.Find(&games).Error; err != nil {
		return nil, err
	}
	return games, nil
}

func (d *Database) GetGamesByStore(storeID string) ([]Game, error) {
	var games []Game
	if err := d.db.Where("store_id = ?", storeID).Find(&games).Error; err != nil {
		return nil, err
	}
	return games, nil
}

func (d *Database) UpdateGame(game *Game) error {
	return d.db.Save(game).Error
}

func (d *Database) DeleteGame(id string) error {
	return d.db.Delete(&Game{}, "id = ?", id).Error
}

func (d *Database) SearchGames(query string) ([]Game, error) {
	var games []Game
	if err := d.db.Where("title LIKE ?", "%"+query+"%").Find(&games).Error; err != nil {
		return nil, err
	}
	return games, nil
}

// Metadata operations

func (d *Database) CreateMetadata(metadata *Metadata) error {
	return d.db.Create(metadata).Error
}

func (d *Database) GetMetadata(gameID string) (*Metadata, error) {
	var metadata Metadata
	if err := d.db.First(&metadata, "game_id = ?", gameID).Error; err != nil {
		return nil, err
	}
	return &metadata, nil
}

func (d *Database) UpdateMetadata(metadata *Metadata) error {
	return d.db.Save(metadata).Error
}

// PlaySession operations

func (d *Database) StartSession(gameID string) (*PlaySession, error) {
	session := &PlaySession{
		GameID:    gameID,
		StartTime: time.Now(),
	}
	if err := d.db.Create(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

func (d *Database) EndSession(sessionID uint) error {
	var session PlaySession
	if err := d.db.First(&session, sessionID).Error; err != nil {
		return err
	}
	
	now := time.Now()
	session.EndTime = &now
	session.Duration = int64(now.Sub(session.StartTime).Seconds())
	
	if err := d.db.Save(&session).Error; err != nil {
		return err
	}

	// Update game play time
	var game Game
	if err := d.db.First(&game, "id = ?", session.GameID).Error; err != nil {
		return err
	}
	
	game.PlayTime += session.Duration
	game.LastPlayed = now
	
	return d.db.Save(&game).Error
}

func (d *Database) GetGameSessions(gameID string) ([]PlaySession, error) {
	var sessions []PlaySession
	if err := d.db.Where("game_id = ?", gameID).Order("start_time DESC").Find(&sessions).Error; err != nil {
		return nil, err
	}
	return sessions, nil
}
