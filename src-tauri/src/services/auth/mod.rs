pub mod amazon;
pub mod epic;
pub mod gog;
pub mod store_manager;

pub use amazon::{AmazonAuth, AuthError};
pub use epic::EpicAuth;
pub use gog::GOGAuthService;
pub use store_manager::{AuthStatus, StoreManager};
