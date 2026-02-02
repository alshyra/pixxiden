use crate::database::{Database, Game};
use crate::models::EnrichedGame;
use crate::services::GameEnricher;
use crate::store::{
    gogdl::GogdlAdapter, legendary::LegendaryAdapter, nile::NileAdapter, steam::SteamAdapter,
};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub legendary: Arc<LegendaryAdapter>,
    pub gogdl: Arc<GogdlAdapter>,
    pub nile: Arc<NileAdapter>,
    pub steam: Arc<SteamAdapter>,
    pub enricher: Arc<Mutex<GameEnricher>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameConfig {
    pub id: String,
    pub title: String,
    pub store: String,
    pub store_id: String,
    pub install_path: Option<String>,
    pub wine_prefix: Option<String>,
    pub wine_version: Option<String>,
    pub installed: bool,
}

/// Get all games with enriched metadata (IGDB, HLTB, ProtonDB, assets)
#[tauri::command]
pub async fn get_games(state: State<'_, AppState>) -> Result<Vec<EnrichedGame>, String> {
    log::info!("Fetching games with enrichment...");

    let db = state.db.lock().await;
    let games = db.get_all_games().await.map_err(|e| e.to_string())?;
    drop(db);

    if games.is_empty() {
        log::info!("No games in database");
        return Ok(vec![]);
    }

    log::info!("Enriching {} games...", games.len());

    let enricher = state.enricher.lock().await;
    let enriched = enricher.enrich_games(&games).await;

    log::info!("Returning {} enriched games", enriched.len());
    Ok(enriched)
}

#[tauri::command]
pub async fn get_game(id: String, state: State<'_, AppState>) -> Result<Option<Game>, String> {
    let db = state.db.lock().await;
    db.get_game(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_game_config(id: String, state: State<'_, AppState>) -> Result<GameConfig, String> {
    let db = state.db.lock().await;
    let game = db
        .get_game(&id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;

    Ok(GameConfig {
        id: game.id,
        title: game.title,
        store: game.store,
        store_id: game.store_id,
        install_path: game.install_path,
        wine_prefix: game.wine_prefix,
        wine_version: game.wine_version,
        installed: game.installed,
    })
}

/// Update custom executable path for a game
#[tauri::command]
pub async fn update_game_custom_executable(
    state: State<'_, AppState>,
    game_id: String,
    custom_executable: Option<String>,
) -> Result<(), String> {
    log::info!(
        "Updating custom executable for game {}: {:?}",
        game_id,
        custom_executable
    );

    let db = state.db.lock().await;
    db.update_custom_executable(&game_id, custom_executable.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Force close a running game
#[tauri::command]
pub async fn force_close_game(game_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db
        .get_game(&game_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", game_id))?;
    drop(db);

    log::info!("Force closing game: {} ({})", game.title, game_id);

    let process_name = game.title.split_whitespace().next().unwrap_or(&game.title);

    let output = std::process::Command::new("pkill")
        .args(["-9", "-f", process_name])
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                log::info!("Successfully killed process for game: {}", game.title);
            } else {
                log::info!("No running process found for game: {}", game.title);
            }
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to execute pkill: {}", e);
            Err(format!("Failed to kill process: {}", e))
        }
    }
}
