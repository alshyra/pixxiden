use crate::database::{Database, Game};
use crate::store::{legendary::LegendaryAdapter, gogdl::GogdlAdapter, nile::NileAdapter, StoreAdapter};
use crate::system::{self, SystemInfo, DiskInfo, SettingsConfig};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::{State, Window, Emitter, Manager};
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub legendary: Arc<LegendaryAdapter>,
    pub gogdl: Arc<GogdlAdapter>,
    pub nile: Arc<NileAdapter>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchEvent {
    pub game_id: String,
    pub game_title: String,
    pub store: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchSuccessEvent {
    pub game_id: String,
    pub pid: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchErrorEvent {
    pub game_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallEvent {
    pub game_id: String,
    pub game_title: String,
    pub store: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgressEvent {
    pub game_id: String,
    pub progress: f32,
    pub downloaded: String,
    pub total: String,
    pub speed: String,
    pub eta: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallSuccessEvent {
    pub game_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallErrorEvent {
    pub game_id: String,
    pub error: String,
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
pub async fn launch_game(id: String, window: Window, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db.get_game(&id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;
    
    drop(db); // Release lock before launching
    
    // Emit launching event
    let launch_event = LaunchEvent {
        game_id: id.clone(),
        game_title: game.title.clone(),
        store: game.store.clone(),
    };
    let _ = window.emit("game-launching", &launch_event);
    log::info!("Launching game: {} ({})", game.title, game.store);
    
    // Launch the game
    let result = match game.store.as_str() {
        "epic" => state.legendary.launch_game(&game.store_id).await,
        "gog" => {
            // Check if this is a game from ~/GOG Games/ (has install_path set)
            if game.install_path.is_some() && game.store_id.starts_with("baldurs_gate") {
                // Use Wine-GE directly
                state.gogdl.launch_game_with_wine(&game).await
            } else {
                // Use gogdl binary (Heroic managed games)
                state.gogdl.launch_game(&game.store_id).await
            }
        },
        "amazon" => state.nile.launch_game(&game.store_id).await,
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    };
    
    match result {
        Ok(()) => {
            // Wait a bit for the process to start
            tokio::time::sleep(Duration::from_secs(2)).await;
            
            // Emit success event
            let success_event = LaunchSuccessEvent {
                game_id: id.clone(),
                pid: None, // We could track PIDs if needed
            };
            let _ = window.emit("game-launched", &success_event);
            log::info!("Game launched successfully: {}", game.title);
            
            Ok(())
        }
        Err(e) => {
            // Emit error event
            let error_event = LaunchErrorEvent {
                game_id: id.clone(),
                error: e.to_string(),
            };
            let _ = window.emit("game-launch-failed", &error_event);
            log::error!("Failed to launch game {}: {}", game.title, e);
            
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn install_game(id: String, window: Window, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db.get_game(&id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;
    
    drop(db);
    
    // Emit install started event
    let install_event = InstallEvent {
        game_id: id.clone(),
        game_title: game.title.clone(),
        store: game.store.clone(),
    };
    let _ = window.emit("game-installing", &install_event);
    
    let result = match game.store.as_str() {
        "epic" => state.legendary.install_game_with_progress(&game.store_id, &window, &id).await,
        "gog" => state.gogdl.install_game_with_progress(&game.store_id, &window, &id).await,
        "amazon" => state.nile.install_game(&game.store_id).await,
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    };
    
    match &result {
        Ok(_) => {
            let _ = window.emit("game-installed", InstallSuccessEvent { game_id: id.clone() });
        }
        Err(e) => {
            let _ = window.emit("game-install-failed", InstallErrorEvent {
                game_id: id.clone(),
                error: e.to_string(),
            });
        }
    }
    
    result.map_err(|e| e.to_string())
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

#[tauri::command]
pub async fn scan_gog_installed(state: State<'_, AppState>) -> Result<Vec<Game>, String> {
    log::info!("Scanning GOG Games directory for installed games...");
    
    let games = state.gogdl.scan_installed_games().await
        .map_err(|e| format!("Failed to scan GOG games: {}", e))?;
    
    // Save to database
    let db = state.db.lock().await;
    for game in &games {
        if let Err(e) = db.upsert_game(game).await {
            log::error!("Failed to save game {}: {}", game.title, e);
        }
    }
    
    log::info!("Found and saved {} GOG games", games.len());
    Ok(games)
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

#[tauri::command]
pub async fn close_splashscreen(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("Closing splash screen and showing main window");
    
    // Get the splash screen window
    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        // Close the splash screen
        splash_window.close().map_err(|e| e.to_string())?;
    }
    
    // Get the main window and show it
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// ===================== SYSTEM COMMANDS =====================

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    system::get_system_info()
}

#[tauri::command]
pub fn get_disk_info() -> Result<Vec<DiskInfo>, String> {
    system::get_disk_info()
}

#[tauri::command]
pub async fn check_for_updates() -> Result<bool, String> {
    system::check_for_updates().await
}

#[tauri::command]
pub async fn shutdown_system() -> Result<(), String> {
    system::shutdown_system().await
}

#[tauri::command]
pub fn get_settings() -> Result<SettingsConfig, String> {
    system::get_settings()
}

#[tauri::command]
pub fn save_settings(config: SettingsConfig) -> Result<(), String> {
    system::save_settings(config)
}
