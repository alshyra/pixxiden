use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AuthError {
    InvalidCredentials,
    TwoFactorRequired,
    NetworkError,
    Unknown(String),
}

impl std::fmt::Display for AuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthError::InvalidCredentials => write!(f, "Invalid email or password"),
            AuthError::TwoFactorRequired => write!(f, "Two-factor authentication required"),
            AuthError::NetworkError => write!(f, "Network error"),
            AuthError::Unknown(msg) => write!(f, "Authentication error: {}", msg),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct NileUser {
    user_id: Option<String>,
    name: Option<String>,
}

pub struct AmazonAuth {
    config_path: PathBuf,
}

impl AmazonAuth {
    pub fn new() -> Self {
        let mut config_path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        config_path.push("nile");
        config_path.push("user.json");
        
        Self { config_path }
    }

    /// Check if user is authenticated (user.json exists and is valid)
    pub async fn is_authenticated(&self) -> bool {
        if !self.config_path.exists() {
            return false;
        }

        match fs::read_to_string(&self.config_path).await {
            Ok(content) => {
                serde_json::from_str::<NileUser>(&content).is_ok()
            }
            Err(_) => false,
        }
    }

    /// Login with email and password
    pub async fn login(&self, email: &str, password: &str) -> Result<(), AuthError> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| AuthError::Unknown(format!("Failed to create config directory: {}", e)))?;
        }

        let output = Command::new("nile")
            .arg("auth")
            .arg("--email")
            .arg(email)
            .arg("--password")
            .arg(password)
            .output()
            .map_err(|e| AuthError::NetworkError)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let error_msg = stderr.to_lowercase();

            return if error_msg.contains("2fa") || error_msg.contains("two-factor") || error_msg.contains("two factor") {
                Err(AuthError::TwoFactorRequired)
            } else if error_msg.contains("invalid") || error_msg.contains("incorrect") {
                Err(AuthError::InvalidCredentials)
            } else if error_msg.contains("network") || error_msg.contains("connection") {
                Err(AuthError::NetworkError)
            } else {
                Err(AuthError::Unknown(stderr.to_string()))
            };
        }

        // Verify authentication succeeded
        if !self.is_authenticated().await {
            return Err(AuthError::Unknown("Authentication completed but config file not found".to_string()));
        }

        Ok(())
    }

    /// Login with email, password, and 2FA code
    pub async fn login_with_2fa(&self, email: &str, password: &str, code: &str) -> Result<(), AuthError> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| AuthError::Unknown(format!("Failed to create config directory: {}", e)))?;
        }

        let output = Command::new("nile")
            .arg("auth")
            .arg("--email")
            .arg(email)
            .arg("--password")
            .arg(password)
            .arg("--2fa")
            .arg(code)
            .output()
            .map_err(|_| AuthError::NetworkError)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let error_msg = stderr.to_lowercase();

            return if error_msg.contains("invalid") || error_msg.contains("incorrect") {
                Err(AuthError::InvalidCredentials)
            } else if error_msg.contains("network") || error_msg.contains("connection") {
                Err(AuthError::NetworkError)
            } else {
                Err(AuthError::Unknown(stderr.to_string()))
            };
        }

        // Verify authentication succeeded
        if !self.is_authenticated().await {
            return Err(AuthError::Unknown("Authentication completed but config file not found".to_string()));
        }

        Ok(())
    }

    /// Get authenticated username
    pub async fn get_username(&self) -> Option<String> {
        if !self.is_authenticated().await {
            return None;
        }

        let content = fs::read_to_string(&self.config_path).await.ok()?;
        let user: NileUser = serde_json::from_str(&content).ok()?;
        user.name.or(user.user_id)
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
    async fn test_amazon_auth_initialization() {
        let auth = AmazonAuth::new();
        assert!(auth.config_path.to_str().unwrap().contains("nile"));
    }
}
