use tauri::{AppHandle, Manager};

/// Bring the main window to the foreground, unfullscreen + refullscreen trick
/// to work around Wayland focus restrictions on KDE Plasma.
#[tauri::command]
pub async fn focus_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // On Wayland/KDE, simply calling set_focus() may not work if the window
    // is behind a fullscreen game. We use show + unminimize + set_focus.
    window.show().map_err(|e| format!("show: {e}"))?;
    window
        .unminimize()
        .map_err(|e| format!("unminimize: {e}"))?;
    window.set_focus().map_err(|e| format!("set_focus: {e}"))?;

    log::info!("Main window focused");
    Ok(())
}

/// Hide/minimize the main window so a game can take the foreground.
/// Removes alwaysOnTop, then minimizes.
#[tauri::command]
pub async fn hide_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // Remove always-on-top so the game can render in front
    window
        .set_always_on_top(false)
        .map_err(|e| format!("set_always_on_top: {e}"))?;

    // Minimize to get out of the way
    window.minimize().map_err(|e| format!("minimize: {e}"))?;

    log::info!("Main window hidden (minimized, alwaysOnTop disabled)");
    Ok(())
}

/// Restore the main window after a game exits.
/// Re-enables alwaysOnTop and brings window to the foreground.
#[tauri::command]
pub async fn restore_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // Restore from minimized state
    window
        .unminimize()
        .map_err(|e| format!("unminimize: {e}"))?;
    window.show().map_err(|e| format!("show: {e}"))?;

    // Re-enable always-on-top for the launcher experience
    window
        .set_always_on_top(true)
        .map_err(|e| format!("set_always_on_top: {e}"))?;

    // Focus the window
    window.set_focus().map_err(|e| format!("set_focus: {e}"))?;

    log::info!("Main window restored (alwaysOnTop re-enabled, focused)");
    Ok(())
}
