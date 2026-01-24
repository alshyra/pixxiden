use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::{System, Disks};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub cpu_brand: String,
    pub total_memory: u64,
    pub hostname: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
    pub file_system: String,
    pub is_removable: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsConfig {
    pub proton_version: String,
    pub mangohud_enabled: bool,
    pub default_install_path: String,
    pub wine_prefix_path: String,
}

pub fn get_system_info() -> Result<SystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let kernel_version = System::kernel_version().unwrap_or_else(|| "Unknown".to_string());
    
    let cpu_brand = sys.cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    
    let total_memory = sys.total_memory();
    let hostname = System::host_name().unwrap_or_else(|| "Unknown".to_string());

    Ok(SystemInfo {
        os_name,
        os_version,
        kernel_version,
        cpu_brand,
        total_memory,
        hostname,
    })
}

pub fn get_disk_info() -> Result<Vec<DiskInfo>, String> {
    let disks = Disks::new_with_refreshed_list();
    let mut disk_infos = Vec::new();

    for disk in disks.list() {
        let total_space = disk.total_space();
        let available_space = disk.available_space();
        let used_space = total_space.saturating_sub(available_space);

        disk_infos.push(DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space,
            available_space,
            used_space,
            file_system: disk.file_system().to_string_lossy().to_string(),
            is_removable: disk.is_removable(),
        });
    }

    Ok(disk_infos)
}

pub async fn check_for_updates() -> Result<bool, String> {
    // Placeholder for update checking logic
    // In a real implementation, this would check GitHub releases or a custom update server
    Ok(false)
}

pub async fn shutdown_system() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        Command::new("systemctl")
            .arg("poweroff")
            .spawn()
            .map_err(|e| format!("Failed to shutdown: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("shutdown")
            .args(&["/s", "/t", "0"])
            .spawn()
            .map_err(|e| format!("Failed to shutdown: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("shutdown")
            .args(&["-h", "now"])
            .spawn()
            .map_err(|e| format!("Failed to shutdown: {}", e))?;
    }
    
    Ok(())
}

pub fn get_settings() -> Result<SettingsConfig, String> {
    // Placeholder - In production, this would read from a config file
    Ok(SettingsConfig {
        proton_version: "GE-Proton8-32".to_string(),
        mangohud_enabled: false,
        default_install_path: "~/Games".to_string(),
        wine_prefix_path: "~/.local/share/pixxiden/prefixes".to_string(),
    })
}

pub fn save_settings(config: SettingsConfig) -> Result<(), String> {
    // Placeholder - In production, this would save to a config file
    log::info!("Saving settings: proton={}, mangohud={}", 
        config.proton_version, config.mangohud_enabled);
    Ok(())
}
