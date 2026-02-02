use super::AppState;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{Emitter, State, Window};

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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchGameData {
    pub id: String,
    pub title: String,
    pub store: String,
    #[allow(dead_code)]
    pub store_id: String,
    pub app_name: String,
    #[allow(dead_code)]
    pub install_path: Option<String>,
    pub custom_executable: Option<String>,
}

#[tauri::command]
pub async fn launch_game_v2(
    game: LaunchGameData,
    _launch_command: Vec<String>,
    env: std::collections::HashMap<String, String>,
    window: Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let launch_event = LaunchEvent {
        game_id: game.id.clone(),
        game_title: game.title.clone(),
        store: game.store.clone(),
    };
    let _ = window.emit("game-launching", &launch_event);
    log::info!("Launching game (v2): {} ({})", game.title, game.store);

    let result = match game.store.as_str() {
        "epic" => state.legendary.launch_game(&game.app_name).await,
        "gog" => {
            state
                .gogdl
                .launch_game_with_custom_exe(&game.app_name, game.custom_executable.as_deref())
                .await
        }
        "amazon" => state.nile.launch_game(&game.app_name).await,
        "steam" => {
            log::info!("Launching Steam game via protocol: {}", game.app_name);
            Ok(())
        }
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    };

    if !env.is_empty() {
        log::debug!("Launch environment: {:?}", env);
    }

    match result {
        Ok(()) => {
            tokio::time::sleep(Duration::from_secs(2)).await;

            let success_event = LaunchSuccessEvent {
                game_id: game.id.clone(),
                pid: None,
            };
            let _ = window.emit("game-launched", &success_event);
            log::info!("Game launched successfully (v2): {}", game.title);

            Ok(())
        }
        Err(e) => {
            let error_event = LaunchErrorEvent {
                game_id: game.id.clone(),
                error: e.to_string(),
            };
            let _ = window.emit("game-launch-failed", &error_event);
            log::error!("Failed to launch game (v2) {}: {}", game.title, e);

            Err(e.to_string())
        }
    }
}
