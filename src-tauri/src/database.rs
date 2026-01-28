use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Row, Sqlite};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: String,
    pub title: String,
    pub store: String,
    #[serde(rename = "storeId")]
    pub store_id: String,
    pub installed: bool,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "customExecutable")]
    pub custom_executable: Option<String>,
    #[serde(rename = "winePrefix")]
    pub wine_prefix: Option<String>,
    #[serde(rename = "wineVersion")]
    pub wine_version: Option<String>,
    #[serde(rename = "coverUrl")]
    pub cover_url: Option<String>,
    #[serde(rename = "backgroundUrl")]
    pub background_url: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "releaseDate")]
    pub release_date: Option<String>,
    #[serde(rename = "lastPlayed")]
    pub last_played: Option<DateTime<Utc>>,
    #[serde(rename = "playTimeMinutes")]
    pub play_time_minutes: i64,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new() -> anyhow::Result<Self> {
        let data_dir = dirs::data_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find data directory"))?
            .join("Pixxiden");

        std::fs::create_dir_all(&data_dir)?;
        let db_path = data_dir.join("Pixxiden.db");

        let database_url = format!("sqlite:{}?mode=rwc", db_path.display());

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await?;

        let db = Self { pool };
        db.run_migrations().await?;

        log::info!("Database initialized at {:?}", db_path);
        Ok(db)
    }

    async fn run_migrations(&self) -> anyhow::Result<()> {
        // Create games table if not exists
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                store TEXT NOT NULL,
                store_id TEXT NOT NULL,
                installed INTEGER DEFAULT 0,
                install_path TEXT,
                custom_executable TEXT,
                wine_prefix TEXT,
                wine_version TEXT,
                cover_url TEXT,
                background_url TEXT,
                developer TEXT,
                publisher TEXT,
                description TEXT,
                release_date TEXT,
                last_played TEXT,
                play_time_minutes INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(store, store_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Migration: Add custom_executable column if it doesn't exist
        // SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we check first
        let has_custom_executable: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('games') WHERE name = 'custom_executable'",
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(false);

        if !has_custom_executable {
            log::info!("Adding custom_executable column to games table...");
            sqlx::query("ALTER TABLE games ADD COLUMN custom_executable TEXT")
                .execute(&self.pool)
                .await?;
        }

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS play_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                duration_minutes INTEGER,
                FOREIGN KEY (game_id) REFERENCES games(id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_all_games(&self) -> anyhow::Result<Vec<Game>> {
        let rows = sqlx::query(
            r#"
            SELECT id, title, store, store_id, installed, install_path, custom_executable,
                   wine_prefix, wine_version,
                   cover_url, background_url, developer, publisher, description,
                   release_date, last_played, play_time_minutes, created_at, updated_at
            FROM games
            ORDER BY title ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let games: Vec<Game> = rows
            .iter()
            .map(|row| Game {
                id: row.get("id"),
                title: row.get("title"),
                store: row.get("store"),
                store_id: row.get("store_id"),
                installed: row.get::<i32, _>("installed") == 1,
                install_path: row.get("install_path"),
                custom_executable: row.get("custom_executable"),
                wine_prefix: row.get("wine_prefix"),
                wine_version: row.get("wine_version"),
                cover_url: row.get("cover_url"),
                background_url: row.get("background_url"),
                developer: row.get("developer"),
                publisher: row.get("publisher"),
                description: row.get("description"),
                release_date: row.get("release_date"),
                last_played: row
                    .get::<Option<String>, _>("last_played")
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.with_timezone(&Utc)),
                play_time_minutes: row.get("play_time_minutes"),
                created_at: DateTime::parse_from_rfc3339(row.get("created_at"))
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(row.get("updated_at"))
                    .unwrap()
                    .with_timezone(&Utc),
            })
            .collect();

        Ok(games)
    }

    pub async fn get_game(&self, id: &str) -> anyhow::Result<Option<Game>> {
        let row = sqlx::query(
            r#"
            SELECT id, title, store, store_id, installed, install_path, custom_executable,
                   wine_prefix, wine_version,
                   cover_url, background_url, developer, publisher, description,
                   release_date, last_played, play_time_minutes, created_at, updated_at
            FROM games WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|row| Game {
            id: row.get("id"),
            title: row.get("title"),
            store: row.get("store"),
            store_id: row.get("store_id"),
            installed: row.get::<i32, _>("installed") == 1,
            install_path: row.get("install_path"),
            custom_executable: row.get("custom_executable"),
            wine_prefix: row.get("wine_prefix"),
            wine_version: row.get("wine_version"),
            cover_url: row.get("cover_url"),
            background_url: row.get("background_url"),
            developer: row.get("developer"),
            publisher: row.get("publisher"),
            description: row.get("description"),
            release_date: row.get("release_date"),
            last_played: row
                .get::<Option<String>, _>("last_played")
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            play_time_minutes: row.get("play_time_minutes"),
            created_at: DateTime::parse_from_rfc3339(row.get("created_at"))
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(row.get("updated_at"))
                .unwrap()
                .with_timezone(&Utc),
        }))
    }

    pub async fn upsert_game(&self, game: &Game) -> anyhow::Result<()> {
        sqlx::query(
            r#"
            INSERT INTO games (id, title, store, store_id, installed, install_path, custom_executable,
                              wine_prefix, wine_version,
                              cover_url, background_url, developer, publisher, description,
                              release_date, last_played, play_time_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(store, store_id) DO UPDATE SET
                title = excluded.title,
                installed = excluded.installed,
                install_path = excluded.install_path,
                wine_prefix = excluded.wine_prefix,
                wine_version = excluded.wine_version,
                cover_url = excluded.cover_url,
                background_url = excluded.background_url,
                developer = excluded.developer,
                publisher = excluded.publisher,
                description = excluded.description,
                release_date = excluded.release_date,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&game.id)
        .bind(&game.title)
        .bind(&game.store)
        .bind(&game.store_id)
        .bind(if game.installed { 1 } else { 0 })
        .bind(&game.install_path)
        .bind(&game.custom_executable)
        .bind(&game.wine_prefix)
        .bind(&game.wine_version)
        .bind(&game.cover_url)
        .bind(&game.background_url)
        .bind(&game.developer)
        .bind(&game.publisher)
        .bind(&game.description)
        .bind(&game.release_date)
        .bind(game.last_played.map(|dt| dt.to_rfc3339()))
        .bind(game.play_time_minutes)
        .bind(game.created_at.to_rfc3339())
        .bind(game.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn set_installed(
        &self,
        id: &str,
        installed: bool,
        path: Option<&str>,
    ) -> anyhow::Result<()> {
        sqlx::query(
            r#"
            UPDATE games SET installed = ?, install_path = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(if installed { 1 } else { 0 })
        .bind(path)
        .bind(Utc::now().to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_play_time(&self, id: &str, minutes: i64) -> anyhow::Result<()> {
        sqlx::query(
            r#"
            UPDATE games SET 
                play_time_minutes = play_time_minutes + ?,
                last_played = ?,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(minutes)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_custom_executable(
        &self,
        id: &str,
        custom_executable: Option<&str>,
    ) -> anyhow::Result<()> {
        sqlx::query(
            r#"
            UPDATE games SET custom_executable = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(custom_executable)
        .bind(Utc::now().to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
