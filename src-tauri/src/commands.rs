pub mod auth;

use crate::database::{Database, Game};
use crate::models::EnrichedGame;
use crate::services::{GameEnricher, ApiKeysConfig, ApiKeysManager};
use crate::store::{legendary::LegendaryAdapter, gogdl::GogdlAdapter, nile::NileAdapter, steam::SteamAdapter, StoreAdapter};
use crate::system::{self, SystemInfo, DiskInfo, SettingsConfig};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::{State, Window, Emitter, Manager};
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub legendary: Arc<LegendaryAdapter>,
    pub gogdl: Arc<GogdlAdapter>,
    pub nile: Arc<NileAdapter>,
    pub steam: Arc<SteamAdapter>,
    pub enricher: Arc<Mutex<GameEnricher>>,
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SplashProgressEvent {
    pub store: String,
    pub game_title: String,
    pub current: usize,
    pub total: usize,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct StoreStatus {
    pub name: String,
    pub available: bool,
    pub authenticated: bool,
    pub username: Option<String>,
}

// ===================== COMMANDS =====================

/// Get all games with enriched metadata (IGDB, HLTB, ProtonDB, assets)
/// The backend automatically enriches games - frontend just receives Game objects
#[tauri::command]
pub async fn get_games(state: State<'_, AppState>) -> Result<Vec<EnrichedGame>, String> {
    log::info!("Fetching games with enrichment...");
    
    // Get base games from database
    let db = state.db.lock().await;
    let games = db.get_all_games().await.map_err(|e| e.to_string())?;
    drop(db);
    
    if games.is_empty() {
        log::info!("No games in database");
        return Ok(vec![]);
    }
    
    log::info!("Enriching {} games...", games.len());
    
    // Enrich games with metadata (uses cache when available)
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
pub async fn sync_games(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<SyncResult, String> {
    let mut result = SyncResult {
        total_games: 0,
        new_games: 0,
        updated_games: 0,
        errors: vec![],
    };
    
    let db = state.db.lock().await;
    
    // Helper to emit progress
    let emit_progress = |app: &tauri::AppHandle, store: &str, title: &str, current: usize, total: usize| {
        let _ = app.emit("splash-progress", SplashProgressEvent {
            store: store.to_string(),
            game_title: title.to_string(),
            current,
            total,
            message: format!("Syncing {} - {}", store, title),
        });
    };
    
    // Sync Epic Games via Legendary
    if state.legendary.is_available() && state.legendary.is_authenticated().await {
        log::info!("Syncing Epic Games...");
        let _ = app.emit("splash-progress", SplashProgressEvent {
            store: "Epic Games".to_string(),
            game_title: String::new(),
            current: 0,
            total: 0,
            message: "Scanning Epic Games library...".to_string(),
        });
        
        match state.legendary.list_games().await {
            Ok(games) => {
                let total = games.len();
                for (i, game) in games.into_iter().enumerate() {
                    emit_progress(&app, "Epic Games", &game.title, i + 1, total);
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
        let _ = app.emit("splash-progress", SplashProgressEvent {
            store: "GOG".to_string(),
            game_title: String::new(),
            current: 0,
            total: 0,
            message: "Scanning GOG library...".to_string(),
        });
        
        match state.gogdl.list_games().await {
            Ok(games) => {
                let total = games.len();
                for (i, game) in games.into_iter().enumerate() {
                    emit_progress(&app, "GOG", &game.title, i + 1, total);
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
    
    // Emit completion
    let _ = app.emit("splash-progress", SplashProgressEvent {
        store: String::new(),
        game_title: String::new(),
        current: result.total_games,
        total: result.total_games,
        message: format!("Synced {} games", result.total_games),
    });
    
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
                // Use gogdl binary (Heroic managed games) with optional custom executable
                state.gogdl.launch_game_with_custom_exe(&game.store_id, game.custom_executable.as_deref()).await
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
        username: None, // TODO: get Legendary username
    });
    
    statuses.push(StoreStatus {
        name: "gog".to_string(),
        available: state.gogdl.is_available(),
        authenticated: state.gogdl.is_authenticated().await,
        username: None, // TODO: get GOG username
    });
    
    statuses.push(StoreStatus {
        name: "amazon".to_string(),
        available: state.nile.is_available(),
        authenticated: state.nile.is_authenticated().await,
        username: None, // TODO: get Amazon username
    });
    
    statuses.push(StoreStatus {
        name: "steam".to_string(),
        available: state.steam.is_available(),
        authenticated: state.steam.is_authenticated().await,
        username: state.steam.get_username().await,
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
        splash_window.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    
    // Get the main window and show it
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|e: tauri::Error| e.to_string())?;
        main_window.set_focus().map_err(|e: tauri::Error| e.to_string())?;
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

// ===================== CACHE MANAGEMENT COMMANDS =====================

/// Clear cache for a specific game
#[tauri::command]
pub async fn clear_game_cache(game_id: String, state: State<'_, AppState>) -> Result<(), String> {
    log::info!("Clearing cache for game: {}", game_id);
    
    let enricher = state.enricher.lock().await;
    enricher.clear_game_cache(&game_id).await.map_err(|e| e.to_string())?;
    
    log::info!("Cache cleared for game: {}", game_id);
    Ok(())
}

/// Clear all game cache
#[tauri::command]
pub async fn clear_all_cache(state: State<'_, AppState>) -> Result<(), String> {
    log::info!("Clearing all cache...");
    
    let enricher = state.enricher.lock().await;
    enricher.clear_all_cache().await.map_err(|e| e.to_string())?;
    
    log::info!("All cache cleared");
    Ok(())
}

/// Get cache statistics
#[tauri::command]
pub async fn get_cache_stats(state: State<'_, AppState>) -> Result<CacheStatsResponse, String> {
    let enricher = state.enricher.lock().await;
    let stats = enricher.get_cache_stats().await.map_err(|e| e.to_string())?;
    
    Ok(CacheStatsResponse {
        games_count: stats.games_count,
        total_assets_count: stats.total_assets_count,
        total_assets_size_mb: stats.total_assets_size as f64 / 1_048_576.0,
        cache_dir: stats.cache_dir.to_string_lossy().to_string(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStatsResponse {
    pub games_count: u32,
    pub total_assets_count: u32,
    pub total_assets_size_mb: f64,
    pub cache_dir: String,
}

// ============================================================================
// API Keys Management Commands
// ============================================================================

/// API Keys configuration response (for frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeysResponse {
    pub steamgriddb_api_key: Option<String>,
    pub igdb_client_id: Option<String>,
    pub igdb_client_secret: Option<String>,
    pub steam_api_key: Option<String>,
    pub steam_id: Option<String>,
    pub setup_completed: bool,
    pub has_steamgriddb: bool,
    pub has_igdb: bool,
    pub has_steam: bool,
}

impl From<ApiKeysConfig> for ApiKeysResponse {
    fn from(config: ApiKeysConfig) -> Self {
        Self {
            has_steamgriddb: config.has_steamgriddb(),
            has_igdb: config.has_igdb(),
            has_steam: config.has_steam(),
            steamgriddb_api_key: config.steamgriddb_api_key,
            igdb_client_id: config.igdb_client_id,
            igdb_client_secret: config.igdb_client_secret,
            steam_api_key: config.steam_api_key,
            steam_id: config.steam_id,
            setup_completed: config.setup_completed,
        }
    }
}

/// API Keys update request (from frontend)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeysUpdateRequest {
    pub steamgriddb_api_key: Option<String>,
    pub igdb_client_id: Option<String>,
    pub igdb_client_secret: Option<String>,
    pub steam_api_key: Option<String>,
    pub steam_id: Option<String>,
    #[serde(default)]
    pub mark_setup_completed: bool,
}

/// Get current API keys configuration
#[tauri::command]
pub async fn get_api_keys() -> Result<ApiKeysResponse, String> {
    log::info!("Getting API keys configuration...");
    
    let manager = ApiKeysManager::new().map_err(|e| e.to_string())?;
    let config = manager.load().map_err(|e| e.to_string())?;
    
    Ok(config.into())
}

/// Check if initial setup is required
#[tauri::command]
pub async fn needs_setup() -> Result<bool, String> {
    log::info!("Checking if setup is needed...");
    
    let manager = ApiKeysManager::new().map_err(|e| e.to_string())?;
    let needs_setup = !manager.is_setup_completed();
    
    log::info!("Setup needed: {}", needs_setup);
    Ok(needs_setup)
}

/// Save API keys configuration
#[tauri::command]
pub async fn save_api_keys(request: ApiKeysUpdateRequest) -> Result<ApiKeysResponse, String> {
    log::info!("Saving API keys configuration...");
    
    let manager = ApiKeysManager::new().map_err(|e| e.to_string())?;
    let mut config = manager.load().unwrap_or_default();
    
    // Update only provided fields (allow clearing with empty string)
    if let Some(key) = request.steamgriddb_api_key {
        config.steamgriddb_api_key = if key.is_empty() { None } else { Some(key) };
    }
    if let Some(id) = request.igdb_client_id {
        config.igdb_client_id = if id.is_empty() { None } else { Some(id) };
    }
    if let Some(secret) = request.igdb_client_secret {
        config.igdb_client_secret = if secret.is_empty() { None } else { Some(secret) };
    }
    if let Some(key) = request.steam_api_key {
        config.steam_api_key = if key.is_empty() { None } else { Some(key) };
    }
    if let Some(id) = request.steam_id {
        config.steam_id = if id.is_empty() { None } else { Some(id) };
    }
    
    // Mark setup as completed if requested
    if request.mark_setup_completed {
        config.setup_completed = true;
    }
    
    manager.save(&config).map_err(|e| e.to_string())?;
    
    log::info!("API keys configuration saved successfully");
    log::info!(
        "  - SteamGridDB: {}, IGDB: {}, Steam: {}",
        if config.has_steamgriddb() { "✓" } else { "✗" },
        if config.has_igdb() { "✓" } else { "✗" },
        if config.has_steam() { "✓" } else { "✗" }
    );
    
    Ok(config.into())
}

/// Skip initial setup (mark as completed without providing keys)
#[tauri::command]
pub async fn skip_setup() -> Result<(), String> {
    log::info!("Skipping initial setup...");
    
    let manager = ApiKeysManager::new().map_err(|e| e.to_string())?;
    manager.mark_setup_completed().map_err(|e| e.to_string())?;
    
    log::info!("Setup marked as completed (skipped)");
    Ok(())
}

/// Test API keys connectivity
#[tauri::command]
pub async fn test_api_keys(request: ApiKeysUpdateRequest) -> Result<ApiKeyTestResult, String> {
    use crate::services::steamgriddb::SteamGridDBService;
    use crate::services::igdb::IGDBService;
    
    log::info!("Testing API keys...");
    
    let mut result = ApiKeyTestResult::default();
    
    // Test SteamGridDB
    if let Some(ref key) = request.steamgriddb_api_key {
        if !key.is_empty() {
            let service = SteamGridDBService::new(key.clone());
            match service.search_game("Portal").await {
                Ok(Some(_)) => {
                    result.steamgriddb_valid = true;
                    result.steamgriddb_message = Some("Connected successfully".to_string());
                }
                Ok(None) => {
                    result.steamgriddb_valid = true;
                    result.steamgriddb_message = Some("Connected (no test results)".to_string());
                }
                Err(e) => {
                    result.steamgriddb_message = Some(format!("Error: {}", e));
                }
            }
        }
    }
    
    // Test IGDB
    if let (Some(ref client_id), Some(ref client_secret)) = 
        (request.igdb_client_id.clone(), request.igdb_client_secret.clone()) 
    {
        if !client_id.is_empty() && !client_secret.is_empty() {
            let mut service = IGDBService::new(client_id.clone(), client_secret.clone());
            match service.authenticate().await {
                Ok(()) => {
                    result.igdb_valid = true;
                    result.igdb_message = Some("Authenticated successfully".to_string());
                }
                Err(e) => {
                    result.igdb_message = Some(format!("Auth error: {}", e));
                }
            }
        }
    }
    
    // Test Steam (just check format, actual API test would need a valid appid)
    if let (Some(ref key), Some(ref id)) = (request.steam_api_key.clone(), request.steam_id.clone()) {
        if !key.is_empty() && !id.is_empty() {
            // Basic format validation
            if key.len() >= 20 && id.chars().all(|c| c.is_ascii_digit()) {
                result.steam_valid = true;
                result.steam_message = Some("Format valid (not tested against API)".to_string());
            } else {
                result.steam_message = Some("Invalid format".to_string());
            }
        }
    }
    
    log::info!("API key test results: SteamGridDB={}, IGDB={}, Steam={}", 
        result.steamgriddb_valid, result.igdb_valid, result.steam_valid);
    
    Ok(result)
}

/// Update custom executable path for a game
#[tauri::command]
pub async fn update_game_custom_executable(
    state: State<'_, AppState>,
    game_id: String,
    custom_executable: Option<String>,
) -> Result<(), String> {
    log::info!("Updating custom executable for game {}: {:?}", game_id, custom_executable);
    
    let db = state.db.lock().await;
    db.update_custom_executable(&game_id, custom_executable.as_deref())
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Force close a running game
#[tauri::command]
pub async fn force_close_game(
    game_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db.get_game(&game_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", game_id))?;
    drop(db);
    
    log::info!("Force closing game: {} ({})", game.title, game_id);
    
    // Try to find and kill the game process by name
    // This uses pkill on Linux to find processes matching the game title
    let process_name = game.title.split_whitespace().next().unwrap_or(&game.title);
    
    let output = std::process::Command::new("pkill")
        .args(["-9", "-f", process_name])
        .output();
    
    match output {
        Ok(result) => {
            if result.status.success() {
                log::info!("Successfully killed process for game: {}", game.title);
                Ok(())
            } else {
                // pkill returns non-zero if no process found, which is fine
                log::info!("No running process found for game: {}", game.title);
                Ok(())
            }
        }
        Err(e) => {
            log::error!("Failed to execute pkill: {}", e);
            Err(format!("Failed to kill process: {}", e))
        }
    }
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyTestResult {
    pub steamgriddb_valid: bool,
    pub steamgriddb_message: Option<String>,
    pub igdb_valid: bool,
    pub igdb_message: Option<String>,
    pub steam_valid: bool,
    pub steam_message: Option<String>,
}
