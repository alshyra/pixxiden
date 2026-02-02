use super::AppState;
use serde::Serialize;
use tauri::{Emitter, State, Window};

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

#[tauri::command]
pub async fn install_game(
    id: String,
    window: Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db
        .get_game(&id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game {} not found", id))?;

    drop(db);

    let install_event = InstallEvent {
        game_id: id.clone(),
        game_title: game.title.clone(),
        store: game.store.clone(),
    };
    let _ = window.emit("game-installing", &install_event);

    let result = match game.store.as_str() {
        "epic" => {
            state
                .legendary
                .install_game_with_progress(&game.store_id, &window, &id)
                .await
        }
        "gog" => {
            state
                .gogdl
                .install_game_with_progress(&game.store_id, &window, &id)
                .await
        }
        "amazon" => state.nile.install_game(&game.store_id).await,
        _ => Err(anyhow::anyhow!("Unknown store: {}", game.store)),
    };

    match &result {
        Ok(_) => {
            let _ = window.emit(
                "game-installed",
                InstallSuccessEvent {
                    game_id: id.clone(),
                },
            );
        }
        Err(e) => {
            let _ = window.emit(
                "game-install-failed",
                InstallErrorEvent {
                    game_id: id.clone(),
                    error: e.to_string(),
                },
            );
        }
    }

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn uninstall_game(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    let game = db
        .get_game(&id)
        .await
        .map_err(|e| e.to_string())?
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
