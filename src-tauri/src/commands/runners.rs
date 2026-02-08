use crate::runners;
use tauri::Emitter;

/// Download a file from URL to destination with progress events
#[tauri::command]
pub async fn download_file(url: String, dest: String, app: tauri::AppHandle) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;

    log::info!("Downloading {} -> {}", url, dest);

    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&dest).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let mut response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    log::info!("Download size: {} bytes", total_size);

    let mut file = tokio::fs::File::create(&dest)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut last_progress: u32 = 0;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Stream error: {}", e))?
    {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Write error: {}", e))?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let progress = ((downloaded as f64 / total_size as f64) * 100.0) as u32;
            // Only emit on percentage change to avoid flooding
            if progress != last_progress {
                last_progress = progress;
                let _ = app.emit(
                    "download-progress",
                    serde_json::json!({
                        "downloaded": downloaded,
                        "total": total_size,
                        "progress": progress
                    }),
                );
            }
        }
    }

    log::info!("Download complete: {} bytes written", downloaded);
    Ok(())
}

/// Extract a runner tarball to the runners directory
#[tauri::command]
pub async fn extract_runner_tarball(source: String, dest: String) -> Result<(), String> {
    log::info!("Extracting {} -> {}", source, dest);
    tokio::task::spawn_blocking(move || runners::extract_tarball(&source, &dest))
        .await
        .map_err(|e| format!("Extraction task failed: {}", e))?
}

/// List all installed runner versions
#[tauri::command]
pub fn get_installed_runners() -> Result<Vec<String>, String> {
    runners::list_installed_runners()
}

/// Check if a specific runner version exists
#[tauri::command]
pub fn check_runner_exists(version: String) -> bool {
    runners::check_runner_exists(&version)
}

/// Get the full path to a runner's proton binary
#[tauri::command]
pub fn get_runner_path(version: String) -> Result<Option<String>, String> {
    Ok(runners::get_runner_path(&version))
}

/// Remove a runner version
#[tauri::command]
pub fn remove_runner(version: String) -> Result<(), String> {
    runners::remove_runner(&version)
}

/// Get the runners directory path (creates it if needed)
#[tauri::command]
pub fn get_runners_dir() -> Result<String, String> {
    runners::ensure_dirs()?;
    runners::get_runners_dir()
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid runners directory path".to_string())
}

/// Get the prefixes directory path (creates it if needed)
#[tauri::command]
pub fn get_prefixes_dir() -> Result<String, String> {
    runners::ensure_dirs()?;
    runners::get_prefixes_dir()
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid prefixes directory path".to_string())
}
