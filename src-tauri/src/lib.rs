mod commands;
mod database;
mod gamepad;
mod models;
mod services;
mod store;
mod sudoers;
mod system;
mod system_updates;

#[cfg(test)]
mod tests;

use commands::{
    auth::{
        amazon_is_authenticated, amazon_login, amazon_login_with_2fa, amazon_logout,
        epic_is_authenticated, epic_logout, epic_start_auth, get_stores_auth_status,
        gog_get_auth_url, gog_is_authenticated, gog_login_with_code, gog_logout, AuthState,
    },
    check_for_updates,
    check_system_updates,
    clear_all_cache,
    clear_game_cache,
    close_splashscreen,
    configure_sudoers,
    force_close_game,
    get_api_keys,
    get_cache_stats,
    get_disk_info,
    // System Updates
    get_distro,
    get_game,
    get_game_config,
    get_games,
    get_settings,
    get_store_status,
    get_system_info,
    install_game,
    install_system_updates,
    is_sudoers_configured,
    launch_game,
    needs_setup,
    reboot_system,
    requires_system_reboot,
    save_api_keys,
    save_settings,
    scan_gog_installed,
    shutdown_system,
    skip_setup,
    sync_games,
    test_api_keys,
    uninstall_game,
    update_game_custom_executable,
    AppState,
};
use database::Database;
use gamepad::GamepadMonitor;
use services::GameEnricher;
use std::sync::Arc;
use store::{
    gogdl::GogdlAdapter, legendary::LegendaryAdapter, nile::NileAdapter, steam::SteamAdapter,
};
use tauri::{Manager, Window};
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file
    if let Err(e) = dotenvy::dotenv() {
        log::warn!("Failed to load .env file: {}", e);
    }

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
                Database::new()
                    .await
                    .expect("Failed to initialize database")
            });

            // Initialize game enricher
            let enricher = rt.block_on(async {
                let enricher =
                    GameEnricher::new(Default::default()).expect("Failed to create game enricher");
                enricher
                    .init()
                    .await
                    .expect("Failed to initialize game enricher");
                enricher
            });

            // Create store adapters
            let legendary = LegendaryAdapter::new();
            let gogdl = GogdlAdapter::new();
            let nile = NileAdapter::new();
            let steam = SteamAdapter::new();

            // Create app state
            let state = AppState {
                db: Arc::new(Mutex::new(db)),
                legendary: Arc::new(legendary),
                gogdl: Arc::new(gogdl),
                nile: Arc::new(nile),
                steam: Arc::new(steam),
                enricher: Arc::new(Mutex::new(enricher)),
            };

            app.manage(state);

            // Initialize auth state
            let auth_state = AuthState::new(app.handle().clone());
            app.manage(auth_state);

            // Initialize gamepad monitor
            let gamepad_monitor = Arc::new(GamepadMonitor::new());
            app.manage(gamepad_monitor);

            log::info!("Pixxiden initialized successfully!");
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_games,
            get_game,
            get_game_config,
            sync_games,
            scan_gog_installed,
            launch_game,
            install_game,
            uninstall_game,
            get_store_status,
            close_splashscreen,
            start_gamepad_monitoring,
            stop_gamepad_monitoring,
            get_system_info,
            get_disk_info,
            check_for_updates,
            shutdown_system,
            get_settings,
            save_settings,
            clear_game_cache,
            clear_all_cache,
            get_cache_stats,
            // API Keys management
            get_api_keys,
            needs_setup,
            save_api_keys,
            skip_setup,
            test_api_keys,
            // Game settings
            update_game_custom_executable,
            // Game control
            force_close_game,
            // Store Authentication
            get_stores_auth_status,
            epic_start_auth,
            epic_is_authenticated,
            epic_logout,
            gog_get_auth_url,
            gog_login_with_code,
            gog_is_authenticated,
            gog_logout,
            amazon_login,
            amazon_login_with_2fa,
            amazon_is_authenticated,
            amazon_logout,
            // System Updates
            get_distro,
            is_sudoers_configured,
            configure_sudoers,
            check_system_updates,
            install_system_updates,
            requires_system_reboot,
            reboot_system,
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
fn stop_gamepad_monitoring(monitor: tauri::State<'_, Arc<GamepadMonitor>>) -> Result<(), String> {
    monitor.stop();
    log::info!("Gamepad monitoring stopped");
    Ok(())
}
