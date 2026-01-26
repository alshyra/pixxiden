pub mod epic;
pub mod gog;
pub mod amazon;
pub mod store_manager;

pub use epic::EpicAuth;
pub use gog::GOGAuthService;
pub use amazon::{AmazonAuth, AuthError};
pub use store_manager::{StoreManager, AuthStatus};
