use crate::services::auth::{AuthError, StoreManager};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

// State container for StoreManager
pub struct AuthState {
    pub store_manager: Arc<Mutex<StoreManager>>,
}

impl AuthState {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self {
            store_manager: Arc::new(Mutex::new(StoreManager::new(app_handle.clone()))),
        }
    }
}

// Serializable error type for Tauri commands
#[derive(Debug, Serialize, Clone)]
pub struct AuthErrorResponse {
    pub error_type: String,
    pub message: String,
}

impl From<AuthError> for AuthErrorResponse {
    fn from(error: AuthError) -> Self {
        let (error_type, message) = match error {
            AuthError::InvalidCredentials => ("invalid_credentials", "Invalid email or password"),
            AuthError::TwoFactorRequired => {
                ("two_factor_required", "Two-factor authentication required")
            }
            AuthError::NetworkError => ("network_error", "Network error occurred"),
            AuthError::Unknown(ref msg) => ("unknown", msg.as_str()),
        };

        Self {
            error_type: error_type.to_string(),
            message: message.to_string(),
        }
    }
}

// ===== Get Status =====

#[tauri::command]
pub async fn get_stores_auth_status(
    auth_state: State<'_, AuthState>,
) -> Result<HashMap<String, crate::services::auth::AuthStatus>, String> {
    let manager = auth_state.store_manager.lock().await;
    Ok(manager.get_all_auth_status().await)
}

// ===== Epic Games Commands =====

#[tauri::command]
pub async fn epic_start_auth(auth_state: State<'_, AuthState>) -> Result<(), String> {
    let manager = auth_state.store_manager.lock().await;
    manager.epic().start_auth().await
}

#[tauri::command]
pub async fn epic_is_authenticated(auth_state: State<'_, AuthState>) -> Result<bool, String> {
    let manager = auth_state.store_manager.lock().await;
    Ok(manager.epic().is_authenticated().await)
}

#[tauri::command]
pub async fn epic_logout(auth_state: State<'_, AuthState>) -> Result<(), String> {
    let manager = auth_state.store_manager.lock().await;
    manager.epic().logout().await
}

// ===== GOG Commands =====

#[tauri::command]
pub async fn gog_get_auth_url(auth_state: State<'_, AuthState>) -> Result<String, String> {
    let manager = auth_state.store_manager.lock().await;
    manager.gog().get_auth_url().await
}

#[tauri::command]
pub async fn gog_login_with_code(
    auth_state: State<'_, AuthState>,
    code: String,
) -> Result<(), String> {
    let manager = auth_state.store_manager.lock().await;
    manager.gog().login_with_code(&code).await
}

#[tauri::command]
pub async fn gog_is_authenticated(auth_state: State<'_, AuthState>) -> Result<bool, String> {
    let manager = auth_state.store_manager.lock().await;
    Ok(manager.gog().is_authenticated().await)
}

#[tauri::command]
pub async fn gog_logout(auth_state: State<'_, AuthState>) -> Result<(), String> {
    let manager = auth_state.store_manager.lock().await;
    manager.gog().logout().await
}

// ===== Amazon Games Commands =====

#[tauri::command]
pub async fn amazon_login(
    auth_state: State<'_, AuthState>,
    email: String,
    password: String,
) -> Result<(), AuthErrorResponse> {
    let manager = auth_state.store_manager.lock().await;
    manager
        .amazon()
        .login(&email, &password)
        .await
        .map_err(AuthErrorResponse::from)
}

#[tauri::command]
pub async fn amazon_login_with_2fa(
    auth_state: State<'_, AuthState>,
    email: String,
    password: String,
    code: String,
) -> Result<(), AuthErrorResponse> {
    let manager = auth_state.store_manager.lock().await;
    manager
        .amazon()
        .login_with_2fa(&email, &password, &code)
        .await
        .map_err(AuthErrorResponse::from)
}

#[tauri::command]
pub async fn amazon_is_authenticated(auth_state: State<'_, AuthState>) -> Result<bool, String> {
    let manager = auth_state.store_manager.lock().await;
    Ok(manager.amazon().is_authenticated().await)
}

#[tauri::command]
pub async fn amazon_logout(auth_state: State<'_, AuthState>) -> Result<(), String> {
    let manager = auth_state.store_manager.lock().await;
    manager.amazon().logout().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_error_conversion() {
        let error = AuthError::InvalidCredentials;
        let response: AuthErrorResponse = error.into();
        assert_eq!(response.error_type, "invalid_credentials");
    }
}
