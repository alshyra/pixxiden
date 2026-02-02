use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri_plugin_shell::ShellExt;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize)]
struct LegendaryUser {
    #[serde(rename = "displayName")]
    display_name: Option<String>,
    account_id: Option<String>,
}

pub struct EpicAuth {
    config_path: PathBuf,
    app_handle: tauri::AppHandle,
}

impl EpicAuth {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let mut config_path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        config_path.push("legendary");
        config_path.push("user.json");

        Self {
            config_path,
            app_handle,
        }
    }

    pub async fn is_authenticated(&self) -> bool {
        if !self.config_path.exists() {
            return false;
        }

        match fs::read_to_string(&self.config_path).await {
            Ok(content) => serde_json::from_str::<LegendaryUser>(&content).is_ok(),
            Err(_) => false,
        }
    }

    /// Get the Epic OAuth URL directly (without calling legendary to avoid browser opening)
    pub async fn get_auth_url(&self) -> Result<String, String> {
        // Constantes Epic OAuth (depuis legendary source code)
        const CLIENT_ID: &str = "34a02cf8f4414e29b15921876da36f9a";
        
        // Construire l'URL exactement comme legendary le fait
        let redirect_url = format!(
            "https://www.epicgames.com/id/api/redirect?clientId={}&responseType=code",
            CLIENT_ID
        );
        
        // URL encoder le redirect
        let encoded_redirect = urlencoding::encode(&redirect_url);
        
        let auth_url = format!(
            "https://www.epicgames.com/id/login?redirectUrl={}",
            encoded_redirect
        );
        
        log::info!("Epic OAuth URL constructed: {}", auth_url);
        Ok(auth_url)
    }

    /// Complete authentication with the authorization code
    pub async fn complete_auth(&self, auth_code: &str) -> Result<(), String> {
        log::info!("Completing Epic authentication with code: {}", auth_code);
        
        let output = self.app_handle
            .shell()
            .sidecar("legendary")
            .map_err(|e| format!("Failed to get legendary sidecar: {}", e))?
            .args(["auth", "--code", auth_code])
            .output()
            .await
            .map_err(|e| format!("Failed to complete auth: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::error!("Epic auth failed: {}", stderr);
            return Err(format!("Auth failed: {}", stderr));
        }

        log::info!("Epic authentication completed successfully");
        Ok(())
    }

    pub async fn get_username(&self) -> Option<String> {
        if !self.is_authenticated().await {
            return None;
        }

        let content = fs::read_to_string(&self.config_path).await.ok()?;
        let user: LegendaryUser = serde_json::from_str(&content).ok()?;
        user.display_name
    }

    pub async fn logout(&self) -> Result<(), String> {
        if self.config_path.exists() {
            fs::remove_file(&self.config_path)
                .await
                .map_err(|e| format!("Failed to logout: {}", e))?;
        }
        Ok(())
    }
}