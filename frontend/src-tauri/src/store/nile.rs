use crate::database::Game;
use crate::store::StoreAdapter;
use async_trait::async_trait;
use std::path::PathBuf;

/// Nile adapter for Amazon Games
/// Placeholder for future implementation
pub struct NileAdapter {
    binary_path: PathBuf,
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
        let heroic_path = PathBuf::from("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/nile");
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
}

#[async_trait]
impl StoreAdapter for NileAdapter {
    fn name(&self) -> &'static str {
        "amazon"
    }
    
    fn is_available(&self) -> bool {
        self.binary_path.exists()
    }
    
    async fn is_authenticated(&self) -> bool {
        false // Not implemented yet
    }
    
    async fn list_games(&self) -> anyhow::Result<Vec<Game>> {
        // Amazon Games not implemented yet
        Ok(vec![])
    }
    
    async fn launch_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("Amazon Games not implemented")
    }
    
    async fn install_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("Amazon Games not implemented")
    }
    
    async fn uninstall_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("Amazon Games not implemented")
    }
}
