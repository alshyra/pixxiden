pub mod gogdl;
pub mod legendary;
pub mod nile;
pub mod steam;

use crate::database::Game;
use async_trait::async_trait;

#[async_trait]
pub trait StoreAdapter: Send + Sync {
    fn name(&self) -> &'static str;
    fn is_available(&self) -> bool;
    async fn is_authenticated(&self) -> bool;
    async fn list_games(&self) -> anyhow::Result<Vec<Game>>;
    async fn launch_game(&self, store_id: &str) -> anyhow::Result<()>;
    async fn install_game(&self, store_id: &str) -> anyhow::Result<()>;
    async fn uninstall_game(&self, store_id: &str) -> anyhow::Result<()>;
}
