use crate::services::{ApiKeysConfig, ApiKeysManager};
use serde::{Deserialize, Serialize};

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
    use crate::services::igdb::IGDBService;
    use crate::services::steamgriddb::SteamGridDBService;

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
    if let (Some(ref client_id), Some(ref client_secret)) = (
        request.igdb_client_id.clone(),
        request.igdb_client_secret.clone(),
    ) {
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

    // Test Steam (just check format)
    if let (Some(ref key), Some(ref id)) = (request.steam_api_key.clone(), request.steam_id.clone())
    {
        if !key.is_empty() && !id.is_empty() {
            if key.len() >= 20 && id.chars().all(|c| c.is_ascii_digit()) {
                result.steam_valid = true;
                result.steam_message = Some("Format valid (not tested against API)".to_string());
            } else {
                result.steam_message = Some("Invalid format".to_string());
            }
        }
    }

    log::info!(
        "API key test results: SteamGridDB={}, IGDB={}, Steam={}",
        result.steamgriddb_valid,
        result.igdb_valid,
        result.steam_valid
    );

    Ok(result)
}
