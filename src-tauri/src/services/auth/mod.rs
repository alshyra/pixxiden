pub mod epic;
pub mod gog;
pub mod amazon;
pub mod store_manager;

pub use epic::EpicAuth;
pub use gog::GOGAuth;
pub use amazon::{AmazonAuth, AuthError};
pub use store_manager::{StoreManager, AuthStatus, ConfigSource, Store};
