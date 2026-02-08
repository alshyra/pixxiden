# E2E Scenarios

Real user journey tests that simulate actual user behavior in Pixxiden.

## Scenarios

| #   | Scenario              | What it tests                                                               |
| --- | --------------------- | --------------------------------------------------------------------------- |
| 01  | **Library Browsing**  | App launch → library view → game cards → hero banner → filters              |
| 02  | **Game Detail**       | Click game → detail page → title/developer/synopsis → action buttons → back |
| 03  | **Navigation**        | Library → Settings (all tabs) → Downloads → back → rapid nav stability      |
| 04  | **Game Launch**       | Find installed game → Play → launching state → Force Close → restore        |
| 05  | **Game Installation** | Find uninstalled game → Install → modal → cancel                            |

## Prerequisites

- **Release binary**: `bun run tauri:build` (runs against `src-tauri/target/release/Pixxiden`)
- **Real user data**: Tests use your actual synced games (no mocks, no cache clearing)
- **tauri-driver**: Installed via `cargo install tauri-driver`

## Running

```bash
bun run test:e2e          # Run all scenarios
bun run test:e2e:headless # Headless mode (may produce black screenshots on Wayland)
```

## Architecture

- **Page Objects** (`e2e/page-objects/`): Encapsulate UI interactions per page/component
- **Selectors** (`e2e/helpers/selectors.ts`): Centralized `data-testid` selector map
- **Helpers** (`e2e/helpers/`): `waitForAppReady()`, screenshots, Tauri IPC bridge
- **Config** (`wdio.conf.ts`): WebDriverIO + tauri-driver, mocha BDD framework

## Adding a New Scenario

1. Create `e2e/scenarios/NN-description.spec.ts`
2. Use existing POMs or create a new one in `e2e/page-objects/`
3. Add `data-testid` attributes to Vue components if needed
4. Update selectors in `e2e/helpers/selectors.ts`
