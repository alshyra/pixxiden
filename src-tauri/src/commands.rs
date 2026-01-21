use crate::database::{Database, Game};
use crate::store::{legendary::LegendaryAdapter, gogdl::GogdlAdapter, nile::NileAdapter, StoreAdapter};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub legendary: Arc<LegendaryAdapter>,
    pub gogdl: Arc<GogdlAdapter>,
    pub nile: Arc<NileAdapter>,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub total_games: usize,
    pub new_games: usize,
    pub updated_games: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct StoreStatus {
    pub name: String,
    pub available: bool,
    pub authenticated: bool,
}

// ===================== COMMANDS =====================

#[tauri::command]
pub async fn get_games(state: State<'_, AppState>) -> Result<Vec<Game>, String> {
    let db = state.db.lock().await;
    db.get_all_games().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_game(id: String, state: State<'_, AppState>) -> Result<Option<Game>, String> {
    let db = state.db.lock().await;
    db.get_game(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_games(state: State<'_, AppState>) -> Result<SyncResult, String> {
    let mut result = SyncResult {
        total_games: 0,
        new_games: 0,
        updated_games: 0,
        errors: vec![],
    };
    
    let db = state.db.lock().await;
    
    // Sync Epic Games via Legendary
    if state.legendary.is_available() && state.legendary.is_authenticated().await {
        log::info!("Syncing Epic Games...");
        match state.legendary.list_games().await {
            Ok(games) => {
                for game in games {
                    result.total_games += 1;
                    if let Err(e) = db.upsert_game(&game).await {
                        result.errors.push(format!("Failed to save {}: {}", game.title, e));
                    } else {
                        result.new_games += 1;
                    }
                }
                log::info!("Synced {} Epic Games", result.total_games);
            }
            Err(e) => {
                let error = format!("Epic sync failed: {}", e);
                log::error!("{}", error);
                result.errors.push(error);
            }
        }
    } else {
        log::warn!("Epic Games (Legendary) not available or not authenticated");
    }
    
    // Sync GOG via gogdl
    if state.gogdl.is_available() && state.gogdl.is_authenticated().await {
        log::info!("Syncing GOG Games...");
        match state.gogdl.list_games().await {
            Ok(games) => {
                for game in games {
                    result.total_games += 1;
                    if let Err(e) = db.upsert_game(&game).await {
                        result.errors.push(format!("Failed to save {}: {}", game.title, e));
                    } else {
                        result.new_games += 1;
                    }
                }
            }
            Err(e) => {
                let error = format!("GOG sync failed: {}", e);
                log::error!("{}", error);
                result.errors.push(error);
            }
        }
    }
    
    Ok(result)
}

#[tauri::command]
pub async fn launch_game(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db.get_game(&id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;
    
    drop(db); // Release lock before launching
    
    match game.store.as_str() {
        "epic" => state.legendary.launch_game(&game.store_id).await,
        "gog" => state.gogdl.launch_game(&game.store_id).await,
        "amazon" => state.nile.launch_game(&game.store_id).await,
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_game(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db.get_game(&id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;
    
    drop(db);
    
    match game.store.as_str() {
        "epic" => state.legendary.install_game(&game.store_id).await,
        "gog" => state.gogdl.install_game(&game.store_id).await,
        "amazon" => state.nile.install_game(&game.store_id).await,
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn uninstall_game(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db.get_game(&id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;
    
    drop(db);
    
    match game.store.as_str() {
        "epic" => state.legendary.uninstall_game(&game.store_id).await,
        "gog" => state.gogdl.uninstall_game(&game.store_id).await,
        "amazon" => state.nile.uninstall_game(&game.store_id).await,
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_store_status(state: State<'_, AppState>) -> Result<Vec<StoreStatus>, String> {
    let mut statuses = vec![];
    
    statuses.push(StoreStatus {
        name: "epic".to_string(),
        available: state.legendary.is_available(),
        authenticated: state.legendary.is_authenticated().await,
    });
    
    statuses.push(StoreStatus {
        name: "gog".to_string(),
        available: state.gogdl.is_available(),
        authenticated: state.gogdl.is_authenticated().await,
    });
    
    statuses.push(StoreStatus {
        name: "amazon".to_string(),
        available: state.nile.is_available(),
        authenticated: state.nile.is_authenticated().await,
    });
    
    Ok(statuses)
}

#[derive(Debug, Serialize)]
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

#[tauri::command]
pub async fn get_game_config(id: String, state: State<'_, AppState>) -> Result<GameConfig, String> {
    let db = state.db.lock().await;
    let game = db.get_game(&id).await.map_err(|e| e.to_string())?
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
