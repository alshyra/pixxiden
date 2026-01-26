use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

use crate::system_updates::Distro;

/// Status of sudoers configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SudoersStatus {
    pub configured: bool,
    pub distro: Distro,
    pub sudoers_file_exists: bool,
}

const SUDOERS_FILE_PATH: &str = "/etc/sudoers.d/pixxiden";

/// Generate sudoers content based on distribution
fn generate_sudoers_content(username: &str, distro: &Distro) -> String {
    match distro {
        Distro::Arch | Distro::SteamOS => {
            format!(
                r#"# Pixxiden - System update permissions
# Generated automatically - DO NOT EDIT MANUALLY

# Allow Pixxiden to check for updates
{username} ALL=(ALL) NOPASSWD: /usr/bin/pacman -Qu
{username} ALL=(ALL) NOPASSWD: /usr/bin/pacman -Sy
{username} ALL=(ALL) NOPASSWD: /usr/bin/pacman -Syy

# Allow Pixxiden to install updates
{username} ALL=(ALL) NOPASSWD: /usr/bin/pacman -Syu --noconfirm
{username} ALL=(ALL) NOPASSWD: /usr/bin/pacman -Su --noconfirm

# Allow Pixxiden to clean package cache
{username} ALL=(ALL) NOPASSWD: /usr/bin/pacman -Sc --noconfirm

# Allow system reboot
{username} ALL=(ALL) NOPASSWD: /usr/bin/systemctl reboot
{username} ALL=(ALL) NOPASSWD: /usr/bin/systemctl poweroff
"#,
                username = username
            )
        }
        Distro::Debian => {
            format!(
                r#"# Pixxiden - System update permissions
# Generated automatically - DO NOT EDIT MANUALLY

# Allow Pixxiden to check for updates
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt update
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt list --upgradable

# Allow Pixxiden to install updates
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt upgrade -y
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt full-upgrade -y
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt dist-upgrade -y

# Allow Pixxiden to clean
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt autoremove -y
{username} ALL=(ALL) NOPASSWD: /usr/bin/apt autoclean

# Allow system reboot
{username} ALL=(ALL) NOPASSWD: /usr/bin/systemctl reboot
{username} ALL=(ALL) NOPASSWD: /usr/bin/systemctl poweroff
"#,
                username = username
            )
        }
        Distro::Fedora => {
            format!(
                r#"# Pixxiden - System update permissions
# Generated automatically - DO NOT EDIT MANUALLY

# Allow Pixxiden to check for updates
{username} ALL=(ALL) NOPASSWD: /usr/bin/dnf check-update

# Allow Pixxiden to install updates
{username} ALL=(ALL) NOPASSWD: /usr/bin/dnf upgrade -y

# Allow Pixxiden to clean
{username} ALL=(ALL) NOPASSWD: /usr/bin/dnf autoremove -y
{username} ALL=(ALL) NOPASSWD: /usr/bin/dnf clean all

# Allow system reboot
{username} ALL=(ALL) NOPASSWD: /usr/bin/systemctl reboot
{username} ALL=(ALL) NOPASSWD: /usr/bin/systemctl poweroff
"#,
                username = username
            )
        }
        Distro::Unknown => String::new(),
    }
}

/// Get current username
fn get_current_username() -> Result<String, String> {
    std::env::var("USER")
        .or_else(|_| std::env::var("LOGNAME"))
        .map_err(|_| "Unable to determine current username".to_string())
}

/// Check if sudoers is already configured for Pixxiden
pub fn is_sudoers_configured() -> Result<SudoersStatus, String> {
    let distro = crate::system_updates::detect_distro();
    let exists = Path::new(SUDOERS_FILE_PATH).exists();
    
    // If file exists, verify it's valid
    let configured = if exists {
        // Check if visudo validates the file
        let output = Command::new("sudo")
            .args(["visudo", "-c", "-f", SUDOERS_FILE_PATH])
            .output();
        
        match output {
            Ok(out) => out.status.success(),
            Err(_) => false,
        }
    } else {
        false
    };
    
    Ok(SudoersStatus {
        configured,
        distro,
        sudoers_file_exists: exists,
    })
}

/// Configure sudoers for Pixxiden (requires password once)
pub async fn configure_sudoers(password: String) -> Result<(), String> {
    let distro = crate::system_updates::detect_distro();
    
    if matches!(distro, Distro::Unknown) {
        return Err("Unable to detect Linux distribution. Cannot configure sudoers.".to_string());
    }
    
    let username = get_current_username()?;
    let sudoers_content = generate_sudoers_content(&username, &distro);
    
    if sudoers_content.is_empty() {
        return Err("Unsupported distribution for sudoers configuration".to_string());
    }
    
    // Create a temporary file with the sudoers content
    let temp_path = "/tmp/pixxiden_sudoers_temp";
    fs::write(temp_path, &sudoers_content)
        .map_err(|e| format!("Failed to write temporary sudoers file: {}", e))?;
    
    // Validate the sudoers file using visudo
    let validate = Command::new("visudo")
        .args(["-c", "-f", temp_path])
        .output()
        .map_err(|e| format!("Failed to validate sudoers file: {}", e))?;
    
    if !validate.status.success() {
        fs::remove_file(temp_path).ok();
        return Err(format!(
            "Invalid sudoers syntax: {}",
            String::from_utf8_lossy(&validate.stderr)
        ));
    }
    
    // Use sudo with password to copy the file to /etc/sudoers.d/
    // We use `sh -c` with echo to pass the password
    let install_script = format!(
        r#"echo '{}' | sudo -S sh -c 'cp {} {} && chmod 0440 {} && chown root:root {}'"#,
        password.replace("'", "'\\''"), // Escape single quotes
        temp_path,
        SUDOERS_FILE_PATH,
        SUDOERS_FILE_PATH,
        SUDOERS_FILE_PATH
    );
    
    let install = Command::new("sh")
        .args(["-c", &install_script])
        .output()
        .map_err(|e| format!("Failed to install sudoers file: {}", e))?;
    
    // Clean up temp file
    fs::remove_file(temp_path).ok();
    
    if !install.status.success() {
        let stderr = String::from_utf8_lossy(&install.stderr);
        if stderr.contains("incorrect password") || stderr.contains("Sorry") {
            return Err("Mot de passe incorrect".to_string());
        }
        return Err(format!("Failed to install sudoers file: {}", stderr));
    }
    
    // Final validation
    let final_check = Command::new("sudo")
        .args(["visudo", "-c", "-f", SUDOERS_FILE_PATH])
        .output()
        .map_err(|e| format!("Failed to validate installed sudoers: {}", e))?;
    
    if !final_check.status.success() {
        // Rollback: remove the invalid file
        let _ = Command::new("sudo")
            .args(["rm", "-f", SUDOERS_FILE_PATH])
            .output();
        return Err("Sudoers validation failed after installation".to_string());
    }
    
    log::info!("Sudoers configured successfully for user: {}", username);
    Ok(())
}

/// Remove Pixxiden sudoers configuration
pub async fn remove_sudoers_config() -> Result<(), String> {
    if Path::new(SUDOERS_FILE_PATH).exists() {
        Command::new("sudo")
            .args(["rm", "-f", SUDOERS_FILE_PATH])
            .output()
            .map_err(|e| format!("Failed to remove sudoers file: {}", e))?;
        
        log::info!("Sudoers configuration removed");
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_generate_sudoers_content_arch() {
        let content = generate_sudoers_content("testuser", &Distro::Arch);
        assert!(content.contains("testuser"));
        assert!(content.contains("pacman -Syu"));
        assert!(content.contains("NOPASSWD"));
    }
    
    #[test]
    fn test_generate_sudoers_content_debian() {
        let content = generate_sudoers_content("testuser", &Distro::Debian);
        assert!(content.contains("testuser"));
        assert!(content.contains("apt upgrade"));
        assert!(content.contains("NOPASSWD"));
    }
    
    #[test]
    fn test_get_current_username() {
        let username = get_current_username();
        assert!(username.is_ok());
        assert!(!username.unwrap().is_empty());
    }
}
