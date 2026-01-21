// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::Manager;

// Game model matching the backend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Game {
    pub id: String,
    pub title: String,
    #[serde(rename = "storeId")]
    pub store_id: String,
    #[serde(rename = "appId")]
    pub app_id: String,
    pub installed: bool,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "executablePath")]
    pub executable_path: Option<String>,
    pub runner: Option<String>,
    #[serde(rename = "playTime")]
    pub play_time: Option<i64>,
    #[serde(rename = "lastPlayed")]
    pub last_played: Option<String>,
    #[serde(rename = "coverUrl")]
    pub cover_url: Option<String>,
    pub developer: Option<String>,
    pub downloading: Option<bool>,
    #[serde(rename = "downloadProgress")]
    pub download_progress: Option<f64>,
}

const BACKEND_URL: &str = "http://localhost:9090";

// Get all games from backend
#[tauri::command]
async fn get_games() -> Result<Vec<Game>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/games", BACKEND_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to backend: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Backend error: {}", response.status()));
    }

    let games: Vec<Game> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(games)
}

// Sync games from stores
#[tauri::command]
async fn sync_games() -> Result<Vec<Game>, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/games/sync", BACKEND_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to sync games: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Sync error: {}", response.status()));
    }

    let games: Vec<Game> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse sync response: {}", e))?;

    Ok(games)
}

// Launch a game
#[tauri::command]
async fn launch_game(app_id: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/games/launch", BACKEND_URL))
        .json(&serde_json::json!({ "app_id": app_id }))
        .send()
        .await
        .map_err(|e| format!("Failed to launch game: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Launch error: {}", error_text));
    }

    Ok(())
}

// Install a game
#[tauri::command]
async fn install_game(app_id: String, install_path: Option<String>) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut body = serde_json::json!({ "app_id": app_id });
    
    if let Some(path) = install_path {
        body["install_path"] = serde_json::Value::String(path);
    }

    let response = client
        .post(format!("{}/api/games/install", BACKEND_URL))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to install game: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Install error: {}", error_text));
    }

    Ok(())
}

// Uninstall a game
#[tauri::command]
async fn uninstall_game(app_id: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/api/games/{}", BACKEND_URL, app_id))
        .send()
        .await
        .map_err(|e| format!("Failed to uninstall game: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Uninstall error: {}", error_text));
    }

    Ok(())
}

// Check store authentication status
#[tauri::command]
async fn get_store_status(store: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/stores/{}/status", BACKEND_URL, store))
        .send()
        .await
        .map_err(|e| format!("Failed to get store status: {}", e))?;

    if !response.status().is_success() {
        return Ok(false);
    }

    #[derive(Deserialize)]
    struct StatusResponse {
        authenticated: bool,
    }

    let status: StatusResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse status: {}", e))?;

    Ok(status.authenticated)
}

// Authenticate with a store
#[tauri::command]
async fn authenticate_store(store: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/stores/{}/auth", BACKEND_URL, store))
        .send()
        .await
        .map_err(|e| format!("Failed to authenticate: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Auth error: {}", error_text));
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_games,
            sync_games,
            launch_game,
            install_game,
            uninstall_game,
            get_store_status,
            authenticate_store
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
