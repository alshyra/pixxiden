use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri_plugin_shell::ShellExt;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize)]
struct GOGAuth {
    #[serde(rename = "access_token")]
    access_token: Option<String>,
    #[serde(rename = "refresh_token")]
    refresh_token: Option<String>,
    user_id: Option<String>,
}

pub struct GOGAuthService {
    config_path: PathBuf,
    app_handle: tauri::AppHandle,
}

impl GOGAuthService {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let mut config_path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        config_path.push("heroic");
        config_path.push("gog_store");
        config_path.push("auth.json");

        Self {
            config_path,
            app_handle,
        }
    }

    /// Check if user is authenticated (auth.json exists and is valid)
    pub async fn is_authenticated(&self) -> bool {
        if !self.config_path.exists() {
            return false;
        }

        match fs::read_to_string(&self.config_path).await {
            Ok(content) => {
                if let Ok(auth) = serde_json::from_str::<GOGAuth>(&content) {
                    auth.access_token.is_some() && auth.refresh_token.is_some()
                } else {
                    false
                }
            }
            Err(_) => false,
        }
    }

    /// Get authentication URL for GOG login
    pub async fn get_auth_url(&self) -> Result<String, String> {
        let output = self
            .app_handle
            .shell()
            .sidecar("gogdl")
            .map_err(|e| format!("Failed to get gogdl sidecar: {}", e))?
            .arg("auth")
            .arg("--login-url")
            .output()
            .await
            .map_err(|e| format!("Failed to get GOG auth URL: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("gogdl auth --login-url failed: {}", stderr));
        }

        let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if url.is_empty() {
            return Err("GOG auth URL is empty".to_string());
        }

        Ok(url)
    }

    /// Login with authentication code from GOG website
    pub async fn login_with_code(&self, code: &str) -> Result<(), String> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let output = self
            .app_handle
            .shell()
            .sidecar("gogdl")
            .map_err(|e| format!("Failed to get gogdl sidecar: {}", e))?
            .arg("auth")
            .arg("--code")
            .arg(code)
            .output()
            .await
            .map_err(|e| format!("Failed to authenticate with GOG: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("GOG authentication failed: {}", stderr));
        }

        // Verify authentication succeeded
        if !self.is_authenticated().await {
            return Err("Authentication completed but config file not found".to_string());
        }

        Ok(())
    }

    /// Logout (delete auth.json)
    pub async fn logout(&self) -> Result<(), String> {
        if self.config_path.exists() {
            fs::remove_file(&self.config_path)
                .await
                .map_err(|e| format!("Failed to logout: {}", e))?;
        }
        Ok(())
    }
}
