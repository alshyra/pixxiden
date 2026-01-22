mod commands;
mod database;
mod gamepad;
mod store;

#[cfg(test)]
mod tests;

use commands::{
    get_game, get_games, get_store_status, get_game_config, install_game, launch_game, sync_games, uninstall_game,
    close_splashscreen, AppState,
};
use database::Database;
use gamepad::GamepadMonitor;
use store::{gogdl::GogdlAdapter, legendary::LegendaryAdapter, nile::NileAdapter};
use std::sync::Arc;
use tauri::{Manager, Window};
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize logging
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database and adapters in a blocking context
            let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
            let db = rt.block_on(async {
                Database::new().await.expect("Failed to initialize database")
            });

            // Create store adapters
            let legendary = LegendaryAdapter::new();
            let gogdl = GogdlAdapter::new();
            let nile = NileAdapter::new();

            // Create app state
            let state = AppState {
                db: Arc::new(Mutex::new(db)),
                legendary: Arc::new(legendary),
                gogdl: Arc::new(gogdl),
                nile: Arc::new(nile),
            };

            app.manage(state);
            
            // Initialize gamepad monitor
            let gamepad_monitor = Arc::new(GamepadMonitor::new());
            app.manage(gamepad_monitor);

            log::info!("PixiDen initialized successfully!");
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_games,
            get_game,
            get_game_config,
            sync_games,
            launch_game,
            install_game,
            uninstall_game,
            get_store_status,
            close_splashscreen,
            start_gamepad_monitoring,
            stop_gamepad_monitoring,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Start gamepad monitoring for overlay toggle
#[tauri::command]
fn start_gamepad_monitoring(
    window: Window,
    monitor: tauri::State<'_, Arc<GamepadMonitor>>,
) -> Result<(), String> {
    if monitor.is_running() {
        log::info!("Gamepad monitor already running");
        return Ok(());
    }
    
    monitor.start(window);
    log::info!("Gamepad monitoring started");
    Ok(())
}

/// Stop gamepad monitoring
#[tauri::command]
fn stop_gamepad_monitoring(
    monitor: tauri::State<'_, Arc<GamepadMonitor>>,
) -> Result<(), String> {
    monitor.stop();
    log::info!("Gamepad monitoring stopped");
    Ok(())
}
