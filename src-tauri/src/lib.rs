mod commands;
mod gamepad;
mod runners;
mod sudoers;
mod system;
mod system_updates;

#[cfg(test)]
mod tests;

use commands::{
    check_for_updates,
    // Runners (Proton-GE) — only heavy I/O stays in Rust
    check_system_updates,
    configure_sudoers,
    download_file,
    extract_runner_tarball,
    get_disk_info,
    // System Updates
    get_distro,
    get_settings,
    get_system_info,
    install_system_updates,
    is_sudoers_configured,
    reboot_system,
    requires_system_reboot,
    save_settings,
    shutdown_system,
};
use gamepad::GamepadMonitor;
use std::sync::Arc;
use tauri::{Manager, Window};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file
    if let Err(e) = dotenvy::dotenv() {
        log::warn!("Failed to load .env file: {}", e);
    }

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .level(tauri_plugin_log::log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database and adapters in a blocking context
            let _rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

            // Initialize gamepad monitor
            let gamepad_monitor = Arc::new(GamepadMonitor::new());
            app.manage(gamepad_monitor);

            log::info!("Pixxiden initialized successfully!");
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_gamepad_monitoring,
            stop_gamepad_monitoring,
            get_system_info,
            get_disk_info,
            check_for_updates,
            shutdown_system,
            get_settings,
            save_settings,
            // System Updates
            get_distro,
            is_sudoers_configured,
            configure_sudoers,
            check_system_updates,
            install_system_updates,
            requires_system_reboot,
            reboot_system,
            // Runners (Proton-GE) — only heavy I/O stays in Rust
            download_file,
            extract_runner_tarball,
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
