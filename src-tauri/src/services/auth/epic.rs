use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tokio::fs;
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
struct LegendaryUser {
    #[serde(rename = "displayName")]
    display_name: Option<String>,
    account_id: Option<String>,
}

pub struct EpicAuth {
    config_path: PathBuf,
}

impl EpicAuth {
    pub fn new() -> Self {
        let mut config_path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        config_path.push("legendary");
        config_path.push("user.json");
        
        Self { config_path }
    }

    /// Check if user is authenticated (user.json exists and is valid)
    pub async fn is_authenticated(&self) -> bool {
        if !self.config_path.exists() {
            return false;
        }

        // Try to read and parse the file to ensure it's valid
        match fs::read_to_string(&self.config_path).await {
            Ok(content) => {
                serde_json::from_str::<LegendaryUser>(&content).is_ok()
            }
            Err(_) => false,
        }
    }

    /// Start authentication flow (opens browser via legendary CLI)
    pub async fn start_auth(&self) -> Result<(), String> {
        // Launch legendary auth command
        let output = Command::new("legendary")
            .arg("auth")
            .output()
            .map_err(|e| format!("Failed to launch legendary: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Legendary auth failed: {}", stderr));
        }

        // Wait and verify authentication completed
        for _ in 0..30 {
            sleep(Duration::from_secs(1)).await;
            if self.is_authenticated().await {
                return Ok(());
            }
        }

        Err("Authentication timeout - please try again".to_string())
    }

    /// Get authenticated username
    pub async fn get_username(&self) -> Option<String> {
        if !self.is_authenticated().await {
            return None;
        }

        let content = fs::read_to_string(&self.config_path).await.ok()?;
        let user: LegendaryUser = serde_json::from_str(&content).ok()?;
        user.display_name
    }

    /// Logout (delete user.json)
    pub async fn logout(&self) -> Result<(), String> {
        if self.config_path.exists() {
            fs::remove_file(&self.config_path)
                .await
                .map_err(|e| format!("Failed to logout: {}", e))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_epic_auth_initialization() {
        let auth = EpicAuth::new();
        assert!(auth.config_path.to_str().unwrap().contains("legendary"));
    }
}
