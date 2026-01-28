use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri_plugin_shell::ShellExt;
use tokio::fs;
use tokio::time::Duration;

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

    pub async fn start_auth(&self) -> Result<(), String> {
        let (_rx, child) = self
            .app_handle
            .shell()
            .sidecar("legendary")
            .map_err(|e| format!("Failed to get legendary sidecar: {}", e))?
            .arg("auth")
            .spawn()
            .map_err(|e| format!("Failed to launch legendary: {}", e))?;

        // Legendary auth ouvre le navigateur et retourne immédiatement
        // Pas besoin d'attendre le processus, on poll l'authentification

        // Wait and verify authentication completed
        for _ in 0..30 {
            tokio::time::sleep(Duration::from_secs(1)).await;
            if self.is_authenticated().await {
                // Kill le processus legendary s'il tourne encore
                let _ = child.kill();
                return Ok(());
            }
        }

        // Timeout - kill le processus
        let _ = child.kill();
        Err("Authentication timeout - please try again".to_string())
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
