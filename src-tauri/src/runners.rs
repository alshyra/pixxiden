//! Proton-GE runner management — Rust-side (heavy I/O only)
//!
//! Only tar.gz extraction stays in Rust (uses bundled flate2/tar crates).
//! All other operations (path resolution, exists checks, directory listing,
//! removal) are handled JS-side via @tauri-apps/plugin-fs + @tauri-apps/api/path.

use flate2::read::GzDecoder;
use std::fs;
use tar::Archive;

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
