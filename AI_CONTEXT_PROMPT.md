# Pixxiden - Development Context & Prompt for AI Assistants

## 🎯 Project Overview

**Pixxiden** is a modern, cozy game library launcher for Linux with multi-store support and session mode capabilities (similar to SteamOS). The name evokes comfort and gaming in a living room setting.

---

## 📋 Core Specifications

### Target Features (MVP - v0.1.0)

#### 1. Multi-Store Support (Priority 0)
- **Epic Games Store** via Legendary CLI (✅ adapter implemented)
- **GOG** via GOGdl CLI (structure ready, needs implementation)
- **Amazon Games** via Nile CLI (structure ready, needs implementation)
- Steam integration is POST-MVP

#### 2. Authentication & Library Management
- OAuth2 authentication for each store (handled by CLI tools)
- Automatic library synchronization
- Multi-account support per store
- Offline mode with cached data

#### 3. Game Library UI
- Grid view with game covers/banners
- Filters: by store, installation status, categories, platform
- Full-text search (title, developer, tags)
- Sorting: alphabetical, play time, recently played, installed first
- ReMiX-inspired dark theme

#### 4. Game Details View
- Metadata: title, developer, publisher, description, release date, genres
- Media: cover art, screenshots carousel, video trailers
- User stats: total play time, last session date, achievements
- Actions: Install, Uninstall, Launch, View in store, Edit metadata

#### 5. Download & Installation Manager
- Download queue with parallel downloads (configurable)
- Bandwidth limiting
- Pause/Resume capability
- Real-time progress: percentage, speed, ETA, size
- Automatic runner detection (Wine/Proton/Native)

#### 6. Game Launching
- Pre-launch: file integrity check, runner selection, env vars setup
- Launch: process monitoring, play time tracking
- Post-launch: auto-save play time, cloud saves sync (future)
- Support for Wine-GE, Proton-GE, and native Linux games

#### 7. Settings Page
Sections:
- **Store Accounts**: Login/logout, sync controls, multi-account management
- **Paths & Storage**: install directories, disk space management
- **Runners**: Wine/Proton installation and configuration
- **Interface**: theme selection, grid size, language, fullscreen mode
- **Controller**: button mapping, vibration, Steam Input compatibility
- **Network**: bandwidth limits, concurrent downloads, offline mode

#### 8. Controller Navigation (Priority 1)
- Full gamepad support: Xbox, PlayStation, Switch Pro, Steam Controller
- D-pad/stick navigation through grid
- Standard button mapping (A/X: select, B/O: back, Y/Triangle: menu, etc.)
- Haptic feedback/vibration
- Big Picture mode auto-activation
- Steam Input compatibility

#### 9. Session Mode (Wayland)
- Run as dedicated gaming session (like SteamOS)
- Gamescope integration for fullscreen compositor
- Auto-start on login
- Power management integration
- Exit to logout

---

## 🏗️ Technical Architecture

### Stack Decisions (VALIDATED)

#### Backend
- **Language**: Go 1.21+
- **Framework**: Standard library + gRPC for IPC
- **Database**: SQLite with GORM ORM
- **CLI Integration**: Wrapper around Legendary, GOGdl, Nile
- **Logging**: logrus
- **Configuration**: Viper (YAML files)

#### Frontend
- **Framework**: Tauri 2.x (Rust + WebView)
- **UI Library**: Vue.js 3 (Composition API)
- **Language**: TypeScript
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Icons**: lucide-vue-next
- **HTTP Client**: Axios

#### Design System
- **Theme**: ReMiX (by jonosellier) - dark theme with indigo accent
- **Colors**:
  - Background: `#0A0A0B` (dark), `#1A1A1D` (cards)
  - Accent: `#6366F1` (indigo)
  - Text: `#F5F5F7` (primary), `#9CA3AF` (secondary)
  - Success: `#10B981`, Warning: `#F59E0B`, Error: `#EF4444`
- **Fonts**: Inter (sans), Poppins (display/headings)
- **Animations**: Smooth transitions, fade-in, slide-up, scale-in

#### External Dependencies
- **Legendary**: Epic Games CLI tool (handles OAuth2, downloads, launching)
- **GOGdl**: GOG CLI tool (developed by Heroic team)
- **Nile**: Amazon Games CLI tool
- **Wine-GE**: Bundled or user-installed
- **Proton-GE**: Optional, auto-detected from Steam
- **Gamescope**: For session mode (Wayland compositor)

---

## 🚫 Design Decisions & Constraints

### What We're NOT Doing

1. **NO Lutris Integration** - Too complex, we bundle Wine-GE directly
2. **NO User-Provided API Keys** (for MVP) - CLI tools handle auth, use public endpoints for metadata
3. **NO Playnite Porting** - Complete rewrite from scratch
4. **NO Steam Support in MVP** - Focus on Epic/GOG/Amazon first
5. **NO Plugin System in MVP** - Keep it simple, add later

### Critical Choices Made

1. **Use Heroic CLI Tools** instead of reimplementing store APIs
   - Legendary, GOGdl, Nile are mature, maintained, and handle OAuth2
   - We wrap them in Go adapters

2. **Wine/Proton Launching is Simple**
   - Just environment variables and `exec.Command`
   - Example:
     ```go
     cmd := exec.Command(protonPath + "/proton", "run", gameExe)
     cmd.Env = append(os.Environ(),
         "STEAM_COMPAT_DATA_PATH=" + prefixPath,
         "PROTON_USE_WINED3D=0",
     )
     ```

3. **Session Mode via Gamescope**
   - Create `.desktop` file in `/usr/share/wayland-sessions/`
   - Launch app with `gamescope -f -e -- Pixxiden --fullscreen`
   - No complex compositor work needed

4. **Testing Strategy**
   - Unit tests for all store adapters (with mocks)
   - Integration tests optional (require real CLI tools)
   - CI/CD with GitHub Actions

---

## 📂 Project Structure (Current State)

```
Pixxiden/
├── backend/
│   ├── cmd/Pixxiden-daemon/main.go          ✅ Entry point
│   ├── internal/
│   │   ├── api/server.go                   ✅ HTTP REST API
│   │   ├── config/config.go                ✅ YAML configuration
│   │   ├── db/database.go                  ✅ SQLite + GORM models
│   │   ├── runner/manager.go               ✅ Wine/Proton management
│   │   └── store/
│   │       ├── legendary/adapter.go        ✅ Epic Games (complete)
│   │       ├── gogdl/adapter.go            ⚠️  Structure only
│   │       └── nile/adapter.go             ⚠️  Structure only
│   └── go.mod                              ✅
│
├── frontend/
│   ├── src/
│   │   ├── components/GameCard.vue         ✅ ReMiX-styled game card
│   │   ├── views/LibraryView.vue           ✅ Main grid view
│   │   ├── stores/library.ts               ✅ Pinia store
│   │   ├── services/api.ts                 ✅ API client
│   │   ├── types/index.ts                  ✅ TypeScript types
│   │   └── App.vue                         ✅ Main app with navbar
│   ├── src-tauri/                          ❌ MISSING - needs creation
│   ├── package.json                        ✅
│   └── tailwind.config.js                  ✅ ReMiX theme
│
├── scripts/Pixxiden-session                 ✅ Gamescope launcher
├── README.md, QUICKSTART.md, etc.          ✅
└── Pixxiden-session.desktop                 ✅
```

---

## 🐛 Current Issue: Missing Tauri Configuration

### Error

```
thread '<unnamed>' panicked at crates/tauri-cli/src/helpers/app_paths.rs:136:5:
Couldn't recognize the current folder as a Tauri project. It must contain a 
`tauri.conf.json`, `tauri.conf.json5` or `Tauri.toml` file in any subfolder.
```

### What's Missing

The `frontend/src-tauri/` directory needs to be properly initialized with:
1. `src-tauri/tauri.conf.json` - Tauri configuration
2. `src-tauri/src/main.rs` - Rust entry point
3. `src-tauri/Cargo.toml` - Rust dependencies
4. `src-tauri/build.rs` - Build script (optional)
5. IPC command handlers for backend communication

### Required Tauri Configuration

**Key settings needed:**
- App identifier: `com.Pixxiden.app`
- Window config: titlebar, resizable, fullscreen support
- IPC allowlist: commands for backend communication
- Build targets: Linux (AppImage, deb)
- CSP policy for Axios requests to localhost:9090

---

## 🎯 Implementation Priorities

### Phase 1: Fix Tauri Setup (URGENT)
1. Create proper `src-tauri/` structure
2. Initialize Tauri with `tauri init` or manual setup
3. Configure IPC commands
4. Test `tauri dev` launches successfully

### Phase 2: Complete MVP Backend (Priority 0)
1. Implement GOGdl adapter (similar to Legendary)
2. Implement Nile adapter
3. Complete download manager with progress tracking
4. Add proper error handling and user notifications
5. Implement metadata fetching (IGDB fallback to public endpoints)

### Phase 3: Complete MVP Frontend (Priority 0)
1. Create GameDetailView component
2. Create SettingsView (stores, runners, paths)
3. Create DownloadsView (queue, progress bars)
4. Implement context menu on right-click
5. Add loading states and error messages
6. Implement search functionality

### Phase 4: Controller Support (Priority 1)
1. Create `useGamepad` composable
2. Implement navigation via gamepad
3. Add haptic feedback
4. Test with multiple controller types
5. Big Picture mode auto-switch

### Phase 5: Polish & Testing (Priority 1)
1. Unit tests for all adapters
2. E2E tests for critical flows
3. Performance optimization (lazy loading, virtual scrolling)
4. Accessibility improvements
5. Documentation updates

### Phase 6: Session Mode (Priority 2)
1. Test Gamescope integration
2. Power management (suspend/resume)
3. Auto-start configuration
4. Graceful shutdown handling

---

## 📝 Code Examples & Patterns

### Go Backend - Store Adapter Pattern

```go
type StoreAdapter interface {
    Auth() error
    IsAuthenticated() bool
    ListGames() ([]*db.Game, error)
    InstallGame(appID, installPath string) error
    UninstallGame(appID string) error
    LaunchGame(appID, wrapper string) (*exec.Cmd, error)
}
```

### Vue Component Pattern (Composition API)

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/library'

const libraryStore = useLibraryStore()
const loading = ref(false)

const filteredGames = computed(() => {
  // Filter logic
})

onMounted(async () => {
  await libraryStore.fetchGames()
})
</script>
```

### Tauri IPC Command Pattern

```rust
#[tauri::command]
async fn get_games() -> Result<Vec<Game>, String> {
    // Call Go backend via HTTP
    let response = reqwest::get("http://localhost:9090/api/games")
        .await
        .map_err(|e| e.to_string())?;
    
    let games = response.json().await.map_err(|e| e.to_string())?;
    Ok(games)
}
```

---

## 🧪 Testing Requirements

### Backend Tests

```go
// internal/store/legendary/adapter_test.go
func TestListGames_WithMock(t *testing.T) {
    mockCLI := &MockLegendaryCLI{
        ListGamesOutput: []byte(`[{"app_name":"fortnite","title":"Fortnite"}]`),
    }
    adapter := NewAdapterWithCLI(mockCLI)
    
    games, err := adapter.ListGames()
    assert.NoError(t, err)
    assert.Len(t, games, 1)
    assert.Equal(t, "Fortnite", games[0].Title)
}
```

### Frontend Tests

- Component tests with Vue Test Utils
- E2E tests with Playwright (optional for MVP)
- Gamepad navigation tests (manual for MVP)

---

## 🚀 Development Workflow

### Running the Project

```bash
# Terminal 1 - Backend
cd backend
go run cmd/Pixxiden-daemon/main.go

# Terminal 2 - Frontend
cd frontend
npm run tauri:dev
```

### Building for Production

```bash
# Backend
cd backend
go build -o Pixxiden-daemon cmd/Pixxiden-daemon/main.go

# Frontend
cd frontend
npm run tauri:build
```

---

## 📊 API Endpoints (Backend)

### Games
- `GET /api/games` - List all games
- `POST /api/games/sync` - Sync with stores
- `POST /api/games/launch` - Launch a game
- `POST /api/games/install` - Install a game (TODO)
- `DELETE /api/games/:id` - Uninstall a game (TODO)

### Stores
- `POST /api/stores/legendary/auth` - Epic Games login
- `GET /api/stores/legendary/status` - Check auth status
- `POST /api/stores/gogdl/auth` - GOG login (TODO)
- `POST /api/stores/nile/auth` - Amazon login (TODO)

### Runners
- `GET /api/runners` - List available runners (TODO)
- `POST /api/runners/detect` - Detect runners (TODO)

### Metadata
- `GET /api/games/:id/metadata` - Get game metadata (TODO)
- `PUT /api/games/:id/metadata` - Update metadata (TODO)

---

## 🎨 UI/UX Guidelines

### ReMiX Theme Principles
1. **Dark & Cozy**: Dark backgrounds, warm accents
2. **Focus on Visuals**: Game covers are the stars
3. **Smooth Animations**: All transitions 300ms or less
4. **Clear Hierarchy**: Typography scale (text-sm to text-3xl)
5. **Accessible**: Proper contrast ratios, keyboard navigation

### Component Patterns
- **Cards**: Rounded corners (rounded-xl), shadow on hover
- **Buttons**: Primary (accent), Secondary (card bg), Danger (error)
- **Inputs**: Border on focus, ring on active
- **Lists**: Hover states, selected states with accent color

---

## 🔧 Configuration Files

### Backend (`~/.config/Pixxiden/config.yaml`)

```yaml
api:
  port: 9090

stores:
  legendary:
    enabled: true
    binary_path: /usr/bin/legendary
  gogdl:
    enabled: true
    binary_path: /usr/bin/gogdl
  nile:
    enabled: false
    binary_path: /usr/bin/nile

runners:
  wine_ge:
    enabled: true
    path: ~/.local/share/wine-ge/wine-ge-9.0
  proton_ge:
    enabled: false
    path: ~/.local/share/proton-ge/Proton-GE-9.15

paths:
  library: ~/.local/share/Pixxiden/games
  downloads: ~/Games
  prefixes: ~/.local/share/Pixxiden/prefixes
```

---

## 📚 Resources & References

### Documentation
- Tauri 2.x: https://tauri.app/v2/
- Vue 3 Composition API: https://vuejs.org/guide/
- GORM: https://gorm.io/docs/
- Tailwind CSS: https://tailwindcss.com/docs

### CLI Tools
- Legendary: https://github.com/derrod/legendary
- GOGdl: https://github.com/Heroic-Games-Launcher/heroic-gogdl
- Nile: https://github.com/imLinguin/nile
- Heroic Launcher (reference): https://heroicgameslauncher.com/

### Wine/Proton
- Wine-GE: https://github.com/GloriousEggroll/wine-ge-custom
- Proton-GE: https://github.com/GloriousEggroll/proton-ge-custom
- ProtonDB: https://www.protondb.com/

### Design
- ReMiX Theme: https://github.com/jonosellier/ReMiX_jonosellier
- Toggle Theme: https://github.com/jonosellier/toggle-theme-playnite

---

## 💡 Tips for Next Developer

### Quick Wins (Easy to Implement)
1. Add GOGdl adapter - copy Legendary pattern
2. Add context menu on game cards
3. Implement search filter in LibraryView
4. Add loading spinners and error toasts
5. Create GameDetailView with routing

### Medium Complexity
1. Download progress tracking (WebSockets or polling)
2. Metadata from IGDB (API key optional, fallback to public)
3. Controller navigation composable
4. Settings page with form validation
5. Cloud save sync (if stores support it)

### Challenging Features
1. Steam integration (different auth flow)
2. Emulator support (via Lutris scripts?)
3. Plugin system architecture
4. Mobile app with Tauri 2.x
5. Shader cache management for Proton

---

## 🎯 Success Criteria for MVP

An MVP is considered complete when:
1. ✅ User can authenticate with Epic, GOG, Amazon
2. ✅ Library syncs automatically from all connected stores
3. ✅ User can browse games in beautiful grid view
4. ✅ User can install, uninstall, and launch games
5. ✅ Download progress is visible
6. ✅ Games launch with correct Wine/Proton runner
7. ✅ Play time is tracked accurately
8. ✅ Controller navigation works for basic functions
9. ✅ Session mode can be selected at login
10. ✅ No major bugs, app is stable

---

## 🚨 IMMEDIATE ACTION REQUIRED

**FIX TAURI SETUP FIRST**

Create the following files in `frontend/src-tauri/`:

### 1. `tauri.conf.json`
Basic Tauri 2.x configuration with:
- App identifier: `com.Pixxiden.app`
- Window settings (min size, decorations)
- Security CSP allowing localhost:9090
- Build configuration for Linux

### 2. `Cargo.toml`
Rust dependencies:
- tauri 2.x
- tauri-plugin-shell
- serde, serde_json
- reqwest (for backend HTTP calls)

### 3. `src/main.rs`
Basic Tauri app with IPC commands:
```rust
#[tauri::command]
async fn get_games() -> Result<Vec<Game>, String> {
    // HTTP call to http://localhost:9090/api/games
}
```

### 4. `src/lib.rs`
Tauri library setup with command registration

### 5. Test with `npm run tauri:dev`
Should launch without errors

---

## 🎉 You've Got This!

The foundation is solid:
- Clean architecture ✅
- Modern stack ✅
- Beautiful design ✅
- Clear roadmap ✅

Just fix the Tauri setup and start building features one by one. The codebase is well-structured and ready to scale.

**Good luck, and happy coding!** 🚀

---

*Context prepared for: GitHub Copilot, Claude Opus, or any AI assistant*
*Project: Pixxiden v0.1.0*
*Date: January 21, 2026*