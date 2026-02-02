use super::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStatsResponse {
    pub games_count: u32,
    pub total_assets_count: u32,
    pub total_assets_size_mb: f64,
    pub cache_dir: String,
}

/// Clear cache for a specific game
#[tauri::command]
pub async fn clear_game_cache(game_id: String, state: State<'_, AppState>) -> Result<(), String> {
    log::info!("Clearing cache for game: {}", game_id);

    let enricher = state.enricher.lock().await;
    enricher
        .clear_game_cache(&game_id)
        .await
        .map_err(|e| e.to_string())?;

    log::info!("Cache cleared for game: {}", game_id);
    Ok(())
}

/// Clear all game cache
#[tauri::command]
pub async fn clear_all_cache(state: State<'_, AppState>) -> Result<(), String> {
    log::info!("Clearing all cache...");

    let enricher = state.enricher.lock().await;
    enricher
        .clear_all_cache()
        .await
        .map_err(|e| e.to_string())?;

    log::info!("All cache cleared");
    Ok(())
}

/// Get cache statistics
#[tauri::command]
pub async fn get_cache_stats(state: State<'_, AppState>) -> Result<CacheStatsResponse, String> {
    let enricher = state.enricher.lock().await;
    let stats = enricher
        .get_cache_stats()
        .await
        .map_err(|e| e.to_string())?;

    Ok(CacheStatsResponse {
        games_count: stats.games_count,
        total_assets_count: stats.total_assets_count,
        total_assets_size_mb: stats.total_assets_size as f64 / 1_048_576.0,
        cache_dir: stats.cache_dir.to_string_lossy().to_string(),
    })
}
