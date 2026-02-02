use std::path::PathBuf;

/// Nile adapter for Amazon Games
/// Placeholder for future implementation
pub struct NileAdapter {
    binary_path: PathBuf,
    #[allow(dead_code)]
    config_path: PathBuf,
}

impl NileAdapter {
    pub fn new() -> Self {
        let binary_path = Self::find_binary();
        let config_path = Self::find_config();

        Self {
            binary_path,
            config_path,
        }
    }

    fn find_binary() -> PathBuf {
        // Heroic Launcher bundled binary
        let heroic_path =
            PathBuf::from("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/nile");
        if heroic_path.exists() {
            return heroic_path;
        }

        PathBuf::from("nile")
    }

    fn find_config() -> PathBuf {
        dirs::config_dir()
            .map(|c| c.join("nile"))
            .unwrap_or_else(|| PathBuf::from("~/.config/nile"))
    }

    /// Check if Nile binary is available
    pub fn is_available(&self) -> bool {
        self.binary_path.exists()
    }

    /// Check if user is authenticated to Amazon Games
    pub async fn is_authenticated(&self) -> bool {
        false // Amazon Games not implemented yet
    }

    /// DEPRECATED: Migrated to NileService.ts
    pub async fn launch_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("launch_game() migrated to NileService.ts - use TypeScript implementation")
    }

    /// DEPRECATED: Migrated to NileService.ts
    pub async fn install_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("install_game() migrated to NileService.ts - use TypeScript implementation")
    }

    /// DEPRECATED: Migrated to NileService.ts
    pub async fn uninstall_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("uninstall_game() migrated to NileService.ts - use TypeScript implementation")
    }
}
