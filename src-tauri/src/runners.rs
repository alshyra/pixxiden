//! Proton-GE runner management
//!
//! Handles installation, extraction, and management of Proton-GE runners
//! for running Windows games on Linux.
//!
//! Runners are stored in ~/.local/share/pixxiden/runners/
//! Wine prefixes are stored in ~/.local/share/pixxiden/prefixes/

use flate2::read::GzDecoder;
use std::fs;
use std::path::PathBuf;
use tar::Archive;

/// Get the base directory for Proton/Wine runners
pub fn get_runners_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Cannot find home directory")
        .join(".local/share/pixxiden/runners")
}

/// Get the base directory for Wine prefixes
pub fn get_prefixes_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Cannot find home directory")
        .join(".local/share/pixxiden/prefixes")
}

/// Ensure runners and prefixes directories exist
pub fn ensure_dirs() -> Result<(), String> {
    fs::create_dir_all(get_runners_dir())
        .map_err(|e| format!("Failed to create runners directory: {}", e))?;
    fs::create_dir_all(get_prefixes_dir())
        .map_err(|e| format!("Failed to create prefixes directory: {}", e))?;
    Ok(())
}

/// Extract a .tar.gz file to a destination directory
pub fn extract_tarball(source: &str, dest: &str) -> Result<(), String> {
    let file = fs::File::open(source).map_err(|e| format!("Failed to open tarball: {}", e))?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);

    fs::create_dir_all(dest).map_err(|e| format!("Failed to create destination: {}", e))?;
    archive
        .unpack(dest)
        .map_err(|e| format!("Failed to extract tarball: {}", e))?;

    // Clean up tarball after extraction
    if let Err(e) = fs::remove_file(source) {
        log::warn!("Failed to remove tarball after extraction: {}", e);
    }

    Ok(())
}

/// List all installed runner versions
pub fn list_installed_runners() -> Result<Vec<String>, String> {
    let dir = get_runners_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut runners = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("Failed to read runners dir: {}", e))? {
        if let Ok(entry) = entry {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    // Only include directories that contain a proton binary
                    if entry.path().join("proton").exists() {
                        runners.push(name.to_string());
                    }
                }
            }
        }
    }

    runners.sort();
    Ok(runners)
}

/// Check if a specific runner version is installed
pub fn check_runner_exists(version: &str) -> bool {
    get_runners_dir().join(version).join("proton").exists()
}

/// Get the full path to a runner's proton binary
pub fn get_runner_path(version: &str) -> Option<String> {
    let proton_path = get_runners_dir().join(version).join("proton");
    if proton_path.exists() {
        proton_path.to_str().map(|s| s.to_string())
    } else {
        None
    }
}

/// Remove a runner version
pub fn remove_runner(version: &str) -> Result<(), String> {
    let dir = get_runners_dir().join(version);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("Failed to remove runner: {}", e))?;
        log::info!("Removed runner: {}", version);
    }
    Ok(())
}
