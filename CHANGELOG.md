# Changelog

All notable changes to PixiDen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 🔐 Direct Store Authentication (2026-01-26)

**Major Feature**: PixiDen can now authenticate directly with game stores, making Heroic Games Launcher optional while maintaining full compatibility.

**Backend (Rust/Tauri)**

- Added `EpicAuth` service for Epic Games authentication via legendary CLI
- Added `GOGAuth` service for GOG authentication via gogdl CLI
- Added `AmazonAuth` service for Amazon Games authentication via nile CLI
- Added `StoreManager` orchestrator for centralized store management
- Added 13 new Tauri commands for authentication operations
- Added `AuthState` for state management
- Added support for OAuth browser flows (Epic)
- Added support for code-based authentication (GOG)
- Added support for email/password + 2FA authentication (Amazon)

**Frontend (Vue 3 + TypeScript)**

- Added `useAuthStore` Pinia store for authentication state management
- Added `/settings/stores` route for store configuration
- Added `StoresSettings.vue` view with modern UI
- Added `StoreCard.vue` component for individual store display
- Added `EpicAuthModal.vue` for Epic OAuth flow
- Added `GOGAuthModal.vue` for GOG code authentication
- Added `AmazonAuthModal.vue` for Amazon login with 2FA support
- Added TypeScript types: `StoreType`, `AuthStatus`, `ConfigSource`, `AuthErrorResponse`
- Added automatic detection of existing Heroic configurations
- Added "Gérer les Stores" link in Settings → Comptes section

**Features**

- ✅ Independent authentication (no Heroic required)
- ✅ Compatible with existing Heroic configs (shared paths)
- ✅ Secure OAuth/token flows using official CLIs
- ✅ Controller-optimized interface with focus states
- ✅ Loading states, error handling, and success notifications
- ✅ Auto-refresh status after authentication/logout
- ✅ Logout confirmation modal

**Documentation**

- Added `STORE_AUTH.md` - Complete feature documentation
- Added `STORE_AUTH_CHECKLIST.md` - Implementation checklist
- Added `STORE_AUTH_SUMMARY.md` - Executive summary
- Added `scripts/check-clis.sh` - CLI installation checker
- Updated main README with store authentication info

**Dependencies**

- Requires `legendary-gl` CLI for Epic Games
- Requires `gogdl` CLI for GOG
- Requires `nile` CLI for Amazon Games

---

## [0.1.0] - Initial Development

### Added

- Multi-store game library management (Epic, GOG, Amazon, Steam)
- Session mode for dedicated gaming experience
- Controller navigation with gamepad support
- Wine/Proton integration
- Modern ReMiX-inspired UI
- Download manager with queue management
- Play time tracking
- Automatic metadata enrichment (IGDB, HowLongToBeat, ProtonDB)
- Splash screen and game overlay
- Settings management
- E2E test suite with WebdriverIO

### Technical Stack

- Tauri 2.x (Rust backend)
- Vue.js 3.x (Frontend)
- Pinia (State management)
- TypeScript
- Tailwind CSS
- SQLite (Database)
- legendary, gogdl, nile (Store CLIs)

---

[Unreleased]: https://github.com/alshyra/pixxiden/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alshyra/pixxiden/releases/tag/v0.1.0
