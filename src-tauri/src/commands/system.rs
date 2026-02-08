use crate::system::{self, DiskInfo, SettingsConfig, SystemInfo};
use std::path::Path;

/// Check which paths exist on the filesystem (unrestricted — no Tauri FS scope).
/// Used by ProtonService to verify 32-bit system libraries.
#[tauri::command]
pub fn check_paths_exist(paths: Vec<String>) -> Result<Vec<bool>, String> {
    Ok(paths.iter().map(|p| Path::new(p).exists()).collect())
}

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    system::get_system_info()
}

#[tauri::command]
pub fn get_disk_info() -> Result<Vec<DiskInfo>, String> {
    system::get_disk_info()
}

#[tauri::command]
pub async fn check_for_updates() -> Result<bool, String> {
    system::check_for_updates().await
}

#[tauri::command]
pub async fn shutdown_system() -> Result<(), String> {
    system::shutdown_system().await
}

#[tauri::command]
pub fn get_settings() -> Result<SettingsConfig, String> {
    system::get_settings()
}

#[tauri::command]
pub fn save_settings(config: SettingsConfig) -> Result<(), String> {
    system::save_settings(config)
}
