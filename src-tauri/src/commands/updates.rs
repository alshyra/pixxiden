use crate::sudoers::{self, SudoersStatus};
use crate::system_updates::{self, Distro, UpdateCheckResult, UpdateReport};
use tauri::Window;

/// Get the detected Linux distribution
#[tauri::command]
pub fn get_distro() -> Distro {
    system_updates::detect_distro()
}

/// Check if sudoers is configured for Pixxiden updates
#[tauri::command]
pub fn is_sudoers_configured() -> Result<SudoersStatus, String> {
    sudoers::is_sudoers_configured()
}

/// Configure sudoers for passwordless updates (requires password once)
#[tauri::command]
pub async fn configure_sudoers(password: String) -> Result<(), String> {
    sudoers::configure_sudoers(password).await
}

/// Check for available system updates
#[tauri::command]
pub async fn check_system_updates() -> Result<UpdateCheckResult, String> {
    system_updates::check_system_updates().await
}

/// Install system updates
#[tauri::command]
pub async fn install_system_updates(window: Window) -> Result<UpdateReport, String> {
    system_updates::install_system_updates(window).await
}

/// Check if system requires reboot
#[tauri::command]
pub fn requires_system_reboot() -> bool {
    system_updates::requires_system_reboot()
}

/// Reboot the system
#[tauri::command]
pub fn reboot_system() -> Result<(), String> {
    system_updates::reboot_system()
}
