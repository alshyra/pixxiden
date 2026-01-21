# PixiDen E2E Tests

End-to-end tests for PixiDen using Tauri WebDriver with real store binary integration.

## Prerequisites

1. **Tauri Driver** - Install with:
   ```bash
   cargo install tauri-driver
   ```

2. **Built Application** - Build the release version:
   ```bash
   npm run tauri:build
   ```

3. **Store Binaries** - Install the store CLIs:
   - **Legendary** (Epic Games): Install via Heroic Launcher or `pip install legendary-gl`
   - **GOGDL** (GOG): Install via Heroic Launcher or from [GitHub](https://github.com/Heroic-Games-Launcher/heroic-gogdl)
   - **Nile** (Amazon): Install from [GitHub](https://github.com/imLinguin/nile)

4. **Authentication** - Log in to your game stores using the respective CLI tools:
   ```bash
   legendary auth
   gogdl auth
   nile auth
   ```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Build and test (full pipeline)
```bash
npm run test:build
```

### Run specific test file
```bash
npx wdio run wdio.conf.ts --spec e2e/tests/02-store-loading.spec.ts
```

## Test Structure

```
e2e/
├── helpers/
│   ├── index.ts        # Re-exports
│   ├── selectors.ts    # UI element selectors
│   └── utils.ts        # Test utility functions
├── screenshots/        # Test failure screenshots
└── tests/
    ├── 01-app-launch.spec.ts         # Basic app launch tests
    ├── 02-store-loading.spec.ts      # Store integration tests (Legendary, GOGDL, Nile)
    ├── 03-library-ui.spec.ts         # Library UI interactions
    ├── 04-navigation.spec.ts         # Route navigation tests
    ├── 05-game-management.spec.ts    # Install/launch/uninstall tests
    └── 06-store-authentication.spec.ts # Auth status tests
```

## Test Suites

### 1. App Launch (`01-app-launch.spec.ts`)
- Application launches successfully
- Main container is displayed
- Window title is correct
- Library view is default route

### 2. Store Loading (`02-store-loading.spec.ts`)
- Detects Legendary/GOGDL/Nile binary availability
- Loads Epic Games library when Legendary is authenticated
- Loads GOG library when GOGDL is authenticated
- Loads Amazon library when Nile is authenticated
- Parses game metadata correctly
- Combined library from all stores

### 3. Library UI (`03-library-ui.spec.ts`)
- Game grid displays correctly
- Store filter buttons work
- Game sorting (title, playtime, recent)
- Game card hover effects
- Sync button functionality

### 4. Navigation (`04-navigation.spec.ts`)
- Route navigation (Library, Downloads, Settings)
- Settings sidebar sections
- Browser history (back/forward)

### 5. Game Management (`05-game-management.spec.ts`)
- Game detail view loads
- Play button for installed games
- Install button for uninstalled games
- Game configuration retrieval
- Store-specific actions

### 6. Store Authentication (`06-store-authentication.spec.ts`)
- Connection status display
- Connect/disconnect buttons
- Authentication state persistence
- Binary detection status

## Notes

- Tests use **real store binaries** and require authentication
- Some tests (install, launch, uninstall) are skipped by default to prevent accidental downloads
- Screenshots are saved to `e2e/screenshots/` on test completion
- Tests skip gracefully when stores are not available or not authenticated

## Debugging

### View test screenshots
Screenshots are captured at the end of each test suite in `e2e/screenshots/`.

### Increase timeout
Edit `wdio.conf.ts` to increase `waitforTimeout` or `connectionRetryTimeout`.

### Run with verbose logging
```bash
DEBUG=wdio* npm run test:e2e
```

### Check tauri-driver logs
The tauri-driver output is logged during test execution.
