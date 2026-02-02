use super::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct StoreStatus {
    pub name: String,
    pub available: bool,
    pub authenticated: bool,
    pub username: Option<String>,
}

#[tauri::command]
pub async fn get_store_status(state: State<'_, AppState>) -> Result<Vec<StoreStatus>, String> {
    let mut statuses = vec![];

    statuses.push(StoreStatus {
        name: "epic".to_string(),
        available: state.legendary.is_available(),
        authenticated: state.legendary.is_authenticated().await,
        username: None,
    });

    statuses.push(StoreStatus {
        name: "gog".to_string(),
        available: state.gogdl.is_available(),
        authenticated: state.gogdl.is_authenticated().await,
        username: None,
    });

    statuses.push(StoreStatus {
        name: "amazon".to_string(),
        available: state.nile.is_available(),
        authenticated: state.nile.is_authenticated().await,
        username: None,
    });

    statuses.push(StoreStatus {
        name: "steam".to_string(),
        available: state.steam.is_available(),
        authenticated: state.steam.is_authenticated().await,
        username: state.steam.get_username().await,
    });

    Ok(statuses)
}
