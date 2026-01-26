use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

/// Linux distribution types supported
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Distro {
    Arch,       // Arch Linux, CachyOS, EndeavourOS, Manjaro
    SteamOS,    // Steam Deck (Arch-based)
    Debian,     // Debian, Ubuntu, Pop!_OS, Linux Mint
    Fedora,     // Fedora
    Unknown,
}

impl std::fmt::Display for Distro {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Distro::Arch => write!(f, "Arch Linux"),
            Distro::SteamOS => write!(f, "SteamOS"),
            Distro::Debian => write!(f, "Debian/Ubuntu"),
            Distro::Fedora => write!(f, "Fedora"),
            Distro::Unknown => write!(f, "Unknown"),
        }
    }
}

/// Package category
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PackageCategory {
    System,     // kernel, systemd, glibc
    Graphics,   // mesa, nvidia, amd drivers
    Audio,      // pipewire, pulseaudio
    Gaming,     // steam, proton, wine
    Application,// firefox, etc.
    Library,    // other libs
}

/// Represents a package available for update
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePackage {
    pub name: String,
    pub current_version: String,
    pub new_version: String,
    pub category: PackageCategory,
    pub size: u64,
    pub critical: bool,
}

/// Result of checking for updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub distro: Distro,
    pub packages: Vec<UpdatePackage>,
    pub total_size: u64,
    pub requires_reboot: bool,
}

/// Result of installing updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReport {
    pub total_packages: u32,
    pub installed_successfully: u32,
    pub failed: Vec<String>,
    pub requires_reboot: bool,
    pub duration_seconds: u64,
}

/// Progress event for updates
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgressEvent {
    pub stage: String,          // "downloading", "installing", "configuring"
    pub package_name: String,
    pub progress: f32,          // 0-100
    pub downloaded: String,
    pub total: String,
    pub speed: String,
    pub eta: String,
}

/// Detect the current Linux distribution
pub fn detect_distro() -> Distro {
    // Check for SteamOS first (special case)
    if Path::new("/etc/steamos-release").exists() {
        return Distro::SteamOS;
    }
    
    // Read /etc/os-release
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        let content_lower = content.to_lowercase();
        
        // Check ID field
        if content_lower.contains("id=arch") || 
           content_lower.contains("id=cachyos") ||
           content_lower.contains("id=endeavouros") ||
           content_lower.contains("id=manjaro") ||
           content_lower.contains("id_like=arch") {
            return Distro::Arch;
        }
        
        if content_lower.contains("id=debian") ||
           content_lower.contains("id=ubuntu") ||
           content_lower.contains("id=pop") ||
           content_lower.contains("id=linuxmint") ||
           content_lower.contains("id_like=debian") ||
           content_lower.contains("id_like=ubuntu") {
            return Distro::Debian;
        }
        
        if content_lower.contains("id=fedora") ||
           content_lower.contains("id_like=fedora") {
            return Distro::Fedora;
        }
    }
    
    // Fallback: check for package managers
    if Path::new("/usr/bin/pacman").exists() {
        return Distro::Arch;
    }
    if Path::new("/usr/bin/apt").exists() {
        return Distro::Debian;
    }
    if Path::new("/usr/bin/dnf").exists() {
        return Distro::Fedora;
    }
    
    Distro::Unknown
}

/// Check if a package is critical (requires reboot)
fn is_critical_package(name: &str) -> bool {
    let critical_packages = [
        "linux", "kernel", "systemd", "glibc", "mesa", "nvidia",
        "amdgpu", "vulkan", "wayland", "xorg", "intel-media-driver",
    ];
    
    for pkg in &critical_packages {
        if name.to_lowercase().contains(pkg) {
            return true;
        }
    }
    false
}

/// Categorize a package by its name
fn categorize_package(name: &str) -> PackageCategory {
    let name_lower = name.to_lowercase();
    
    // System packages
    if name_lower.contains("linux") || name_lower.contains("kernel") || 
       name_lower.contains("systemd") || name_lower.contains("glibc") ||
       name_lower.contains("coreutils") || name_lower.contains("base") {
        return PackageCategory::System;
    }
    
    // Graphics packages
    if name_lower.contains("mesa") || name_lower.contains("nvidia") ||
       name_lower.contains("amd") || name_lower.contains("vulkan") ||
       name_lower.contains("xorg") || name_lower.contains("wayland") ||
       name_lower.contains("drm") {
        return PackageCategory::Graphics;
    }
    
    // Audio packages
    if name_lower.contains("pipewire") || name_lower.contains("pulseaudio") ||
       name_lower.contains("alsa") || name_lower.contains("audio") {
        return PackageCategory::Audio;
    }
    
    // Gaming packages
    if name_lower.contains("steam") || name_lower.contains("proton") ||
       name_lower.contains("wine") || name_lower.contains("dxvk") ||
       name_lower.contains("gamemode") || name_lower.contains("mangohud") {
        return PackageCategory::Gaming;
    }
    
    // Libraries
    if name_lower.starts_with("lib") || name_lower.contains("-libs") {
        return PackageCategory::Library;
    }
    
    PackageCategory::Application
}

/// Check for available updates using pacman (Arch-based)
async fn check_updates_pacman() -> Result<Vec<UpdatePackage>, String> {
    let output = Command::new("pacman")
        .args(["-Qu"])
        .output()
        .map_err(|e| format!("Failed to run pacman: {}", e))?;
    
    if !output.status.success() && output.stdout.is_empty() {
        // No updates available
        return Ok(vec![]);
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut packages = Vec::new();
    
    for line in stdout.lines() {
        // Format: "package_name current_version -> new_version"
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 && parts[2] == "->" {
            let name = parts[0].to_string();
            let current = parts[1].to_string();
            let new = parts[3].to_string();
            
            packages.push(UpdatePackage {
                critical: is_critical_package(&name),
                category: categorize_package(&name),
                name,
                current_version: current,
                new_version: new,
                size: 0, // Size estimation not available from pacman -Qu
            });
        }
    }
    
    Ok(packages)
}

/// Check for available updates using apt (Debian-based)
async fn check_updates_apt() -> Result<Vec<UpdatePackage>, String> {
    // First, update package list
    Command::new("sudo")
        .args(["apt", "update"])
        .output()
        .map_err(|e| format!("Failed to run apt update: {}", e))?;
    
    let output = Command::new("apt")
        .args(["list", "--upgradable"])
        .output()
        .map_err(|e| format!("Failed to run apt list: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut packages = Vec::new();
    
    for line in stdout.lines().skip(1) { // Skip header line
        // Format: "package/distribution version arch [upgradable from: current]"
        if let Some(name) = line.split('/').next() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let new_version = parts.get(1).unwrap_or(&"").to_string();
                let current_version = if let Some(idx) = line.find("from: ") {
                    line[idx + 6..].trim_end_matches(']').to_string()
                } else {
                    "?".to_string()
                };
                
                packages.push(UpdatePackage {
                    critical: is_critical_package(name),
                    category: categorize_package(name),
                    name: name.to_string(),
                    current_version,
                    new_version,
                    size: 0,
                });
            }
        }
    }
    
    Ok(packages)
}

/// Check for available system updates
pub async fn check_system_updates() -> Result<UpdateCheckResult, String> {
    let distro = detect_distro();
    
    let packages = match distro {
        Distro::Arch | Distro::SteamOS => check_updates_pacman().await?,
        Distro::Debian => check_updates_apt().await?,
        Distro::Fedora => {
            // DNF support can be added later
            return Err("Fedora updates not yet supported".to_string());
        }
        Distro::Unknown => {
            return Err("Unable to detect Linux distribution".to_string());
        }
    };
    
    let requires_reboot = packages.iter().any(|p| p.critical);
    let total_size: u64 = packages.iter().map(|p| p.size).sum();
    
    Ok(UpdateCheckResult {
        distro,
        packages,
        total_size,
        requires_reboot,
    })
}

/// Install system updates (requires sudoers configuration)
pub async fn install_system_updates(
    window: tauri::Window,
) -> Result<UpdateReport, String> {
    let distro = detect_distro();
    let start_time = std::time::Instant::now();
    
    let result = match distro {
        Distro::Arch | Distro::SteamOS => install_updates_pacman(window).await,
        Distro::Debian => install_updates_apt(window).await,
        _ => Err("Unsupported distribution for updates".to_string()),
    };
    
    let duration = start_time.elapsed();
    
    match result {
        Ok((installed, failed)) => {
            let requires_reboot = installed.iter().any(|name| is_critical_package(name));
            
            Ok(UpdateReport {
                total_packages: (installed.len() + failed.len()) as u32,
                installed_successfully: installed.len() as u32,
                failed,
                requires_reboot,
                duration_seconds: duration.as_secs(),
            })
        }
        Err(e) => Err(e),
    }
}

/// Install updates using pacman
async fn install_updates_pacman(
    window: tauri::Window,
) -> Result<(Vec<String>, Vec<String>), String> {
    use tauri::Emitter;
    
    let mut cmd = TokioCommand::new("sudo")
        .args(["pacman", "-Syu", "--noconfirm"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start pacman: {}", e))?;
    
    let stdout = cmd.stdout.take().expect("Failed to capture stdout");
    let mut reader = BufReader::new(stdout).lines();
    
    let mut installed = Vec::new();
    let mut current_package = String::new();
    
    while let Ok(Some(line)) = reader.next_line().await {
        // Parse pacman output for progress
        if line.contains("downloading") {
            if let Some(pkg) = line.split_whitespace().nth(1) {
                current_package = pkg.to_string();
                let _ = window.emit("update-progress", UpdateProgressEvent {
                    stage: "downloading".to_string(),
                    package_name: current_package.clone(),
                    progress: 0.0,
                    downloaded: "0 B".to_string(),
                    total: "? B".to_string(),
                    speed: "".to_string(),
                    eta: "".to_string(),
                });
            }
        } else if line.contains("installing") {
            if let Some(pkg) = line.split_whitespace().nth(1) {
                current_package = pkg.to_string();
                let _ = window.emit("update-progress", UpdateProgressEvent {
                    stage: "installing".to_string(),
                    package_name: current_package.clone(),
                    progress: 50.0,
                    downloaded: "".to_string(),
                    total: "".to_string(),
                    speed: "".to_string(),
                    eta: "".to_string(),
                });
                installed.push(current_package.clone());
            }
        }
    }
    
    let status = cmd.wait().await
        .map_err(|e| format!("Failed to wait for pacman: {}", e))?;
    
    if !status.success() {
        return Err("Pacman update failed".to_string());
    }
    
    Ok((installed, vec![]))
}

/// Install updates using apt
async fn install_updates_apt(
    window: tauri::Window,
) -> Result<(Vec<String>, Vec<String>), String> {
    use tauri::Emitter;
    
    let mut cmd = TokioCommand::new("sudo")
        .args(["apt", "upgrade", "-y"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start apt: {}", e))?;
    
    let stdout = cmd.stdout.take().expect("Failed to capture stdout");
    let mut reader = BufReader::new(stdout).lines();
    
    let mut installed = Vec::new();
    
    while let Ok(Some(line)) = reader.next_line().await {
        // Parse apt output
        if line.contains("Unpacking") || line.contains("Setting up") {
            if let Some(pkg) = line.split_whitespace().nth(1) {
                let _ = window.emit("update-progress", UpdateProgressEvent {
                    stage: if line.contains("Unpacking") { "installing" } else { "configuring" }.to_string(),
                    package_name: pkg.to_string(),
                    progress: 50.0,
                    downloaded: "".to_string(),
                    total: "".to_string(),
                    speed: "".to_string(),
                    eta: "".to_string(),
                });
                installed.push(pkg.to_string());
            }
        }
    }
    
    let status = cmd.wait().await
        .map_err(|e| format!("Failed to wait for apt: {}", e))?;
    
    if !status.success() {
        return Err("Apt upgrade failed".to_string());
    }
    
    Ok((installed, vec![]))
}

/// Check if system requires reboot (checks for various indicators)
pub fn requires_system_reboot() -> bool {
    // Check for Arch/CachyOS: kernel version mismatch
    if let Ok(running) = std::fs::read_to_string("/proc/version") {
        if let Ok(output) = Command::new("pacman").args(["-Q", "linux"]).output() {
            let installed = String::from_utf8_lossy(&output.stdout);
            // If versions differ, reboot needed
            if !installed.is_empty() && !running.contains(installed.trim().split_whitespace().last().unwrap_or("")) {
                return true;
            }
        }
    }
    
    // Check for Debian/Ubuntu: /var/run/reboot-required
    if Path::new("/var/run/reboot-required").exists() {
        return true;
    }
    
    false
}

/// Reboot the system
pub fn reboot_system() -> Result<(), String> {
    Command::new("sudo")
        .args(["systemctl", "reboot"])
        .spawn()
        .map_err(|e| format!("Failed to reboot: {}", e))?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_detect_distro() {
        // This test will detect the actual running distribution
        let distro = detect_distro();
        println!("Detected distribution: {}", distro);
        // Just verify it returns something
        assert!(matches!(distro, Distro::Arch | Distro::SteamOS | Distro::Debian | Distro::Fedora | Distro::Unknown));
    }
    
    #[test]
    fn test_categorize_package() {
        assert!(matches!(categorize_package("linux"), PackageCategory::System));
        assert!(matches!(categorize_package("mesa"), PackageCategory::Graphics));
        assert!(matches!(categorize_package("pipewire"), PackageCategory::Audio));
        assert!(matches!(categorize_package("steam"), PackageCategory::Gaming));
        assert!(matches!(categorize_package("libfoo"), PackageCategory::Library));
    }
    
    #[test]
    fn test_is_critical_package() {
        assert!(is_critical_package("linux"));
        assert!(is_critical_package("linux-cachyos"));
        assert!(is_critical_package("nvidia-dkms"));
        assert!(is_critical_package("mesa"));
        assert!(!is_critical_package("firefox"));
        assert!(!is_critical_package("vim"));
    }
}
