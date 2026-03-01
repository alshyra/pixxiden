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
    check_paths_exist,
    // Runners (Proton-GE) — only heavy I/O stays in Rust
    check_system_updates,
    configure_sudoers,
    download_file,
    extract_runner_tarball,
    // Window management
    focus_main_window,
    get_disk_info,
    // System Updates
    get_distro,
    get_settings,
    get_system_info,
    hide_main_window,
    install_system_updates,
    is_sudoers_configured,
    reboot_system,
    requires_system_reboot,
    restore_main_window,
    save_settings,
    shutdown_system,
};
use gamepad::GamepadMonitor;
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file
    if let Err(e) = dotenvy::dotenv() {
        log::warn!("Failed to load .env file: {}", e);
    }

    // WebKit compositing fix for better performance/stability on Linux
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(
        tauri_plugin_log::Builder::new()
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("pixxiden.log".into()),
                }),
            ])
            .max_file_size(5_000_000) // 5 MB rotation
            .level(tauri_plugin_log::log::LevelFilter::Debug)
            .filter(|metadata| {
                // Reduce noise from network/database libraries
                let target = metadata.target();
                if target.starts_with("hyper")
                    || target.starts_with("reqwest")
                    || target.starts_with("sqlx")
                    || target.starts_with("cookie_store")
                    || target.starts_with("h2")
                    || target.starts_with("hyper_util")
                {
                    metadata.level() <= tauri_plugin_log::log::Level::Warn
                } else {
                    true
                }
            })
            .format(|out, message, record| {
                out.finish(format_args!(
                    "[{} {}] {}",
                    record.level(),
                    record
                        .file()
                        .and_then(|f| std::path::Path::new(f).file_name())
                        .and_then(|f| f.to_str())
                        .unwrap_or("js"),
                    message
                ))
            })
            .build(),
    )
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
        // Initialize database and adapters in a blocking context
        let _rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

        // Initialize gamepad monitor and start it automatically
        let gamepad_monitor = Arc::new(GamepadMonitor::new());
        gamepad_monitor.start(app.handle().clone());
        app.manage(gamepad_monitor);
        log::info!("Gamepad monitoring started automatically");

        // Enable autostart on first launch
        let handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
            let autostart = handle.autolaunch();
            if !autostart.is_enabled().unwrap_or(false) {
                if let Err(e) = autostart.enable() {
                    log::warn!("Failed to enable autostart: {}", e);
                } else {
                    log::info!("Autostart enabled successfully");
                }
            }
        });

        log::info!("Pixxiden initialized successfully!");
        Ok(())
    }).plugin(tauri_plugin_shell::init());

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder = builder.invoke_handler(tauri::generate_handler![
        check_paths_exist,
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
        // Window management
        focus_main_window,
        hide_main_window,
        restore_main_window,
    ]);

    builder.run(tauri::generate_context!()).expect("error while running tauri application");
}
