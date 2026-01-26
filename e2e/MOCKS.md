# Mock Data pour les Tests E2E

## 🎯 Overview

Les tests E2E utilisent désormais des données mockées pour garantir la cohérence et éviter les dépendances externes.

## 📦 Structure

```
e2e/
├── fixtures/
│   └── mockGames.ts          # 15 jeux de démonstration
├── helpers/
    └── mockHelpers.ts        # Fonctions d'injection
```

## 🎮 Données disponibles

**15 jeux mockés** synchronisés avec `src/composables/useDemoGames.ts`:

- **9 installés** : DREDGE, Fortnite, Sea of Thieves, Oblivion, RDR2, Wukong, Helldivers 2, KSP, Little Kitty, Portal 2
- **6 non installés** : Call of Duty, Splitgate 2, Battlefield 3, Hogwarts Legacy, Luigi's Mansion 3

**Distribution par store:**

- Epic Games: 8 jeux
- GOG: 6 jeux
- Amazon: 3 jeux

## 🔧 API

### Fonctions principales

```typescript
// Setup dans before()
await setupMockTauriCommands(); // Mock commandes Tauri
await injectMockGames(); // Injecter les données

// Accès aux données
import {
  mockGames, // Game[] - tous les jeux
  getInstalledGames, // () => Game[]
  getNotInstalledGames, // () => Game[]
  getGamesByStore, // (store: string) => Game[]
  getGameById, // (id: string) => Game | undefined
  getMockGameStats, // () => Stats
  storeStats, // { epic: 8, gog: 6, ... }
} from "../helpers";
```

### Statistiques

```typescript
const stats = getMockGameStats();
// {
//   total: 15,
//   installed: 9,
//   notInstalled: 6,
//   byStore: { epic: 8, gog: 6, amazon: 3, steam: 0 }
// }
```

## 📝 Exemple d'utilisation

### Test avant (avec backend réel)

```typescript
describe("Library UI", () => {
  let games: Game[] = [];

  before(async () => {
    await waitForAppReady();
    await invokeTauriCommand("sync_games"); // ❌ Backend requis
    games = await invokeTauriCommand("get_games");
  });

  it("should display games", async function () {
    if (games.length === 0) this.skip(); // ❌ Tests flaky
    // ...
  });
});
```

### Test après (avec mocks)

```typescript
import { setupMockTauriCommands, mockGames, getMockGameStats } from "../helpers";

describe("Library UI", () => {
  const stats = getMockGameStats();

  before(async () => {
    await waitForAppReady();
    await setupMockTauriCommands(); // ✅ Pas de backend
    await injectMockGames();
  });

  it("should display games", async () => {
    expect(stats.total).toBe(15); // ✅ Déterministe
    const cards = await $$(".game-card");
    expect(cards.length).toBe(15);
  });
});
```

## ✅ Avantages

1. **Déterministe** - Mêmes données à chaque exécution
2. **Rapide** - Pas d'appels réseau ou IPC
3. **Isolé** - Ne dépend pas du système/stores
4. **CI-friendly** - Pas de configuration requise
5. **Cohérent** - Même data que dev mode

## 🔄 Commandes Tauri mockées

Les commandes suivantes sont interceptées :

- `get_games` → retourne `mockGames`
- `sync_games` → simule succès
- `get_game` → trouve par ID
- `launch_game` → simule lancement
- `install_game` → simule installation
- `uninstall_game` → simule désinstallation
- `get_system_info` → retourne specs Linux
- `get_disk_info` → retourne info disque
- `get_store_status` → retourne stores disponibles

## 🧪 Tests mis à jour

- ✅ `03-library-ui.spec.ts` - Filtrage, tri, affichage
- ✅ `05-game-management.spec.ts` - Installation, lancement

## 🚀 Lancer les tests

```bash
# Tous les tests e2e
npm run test:e2e

# Test spécifique
npm run test:e2e -- --spec e2e/tests/03-library-ui.spec.ts

# Mode watch
npm run test:e2e -- --watch
```

## 🔍 Debugging

Les logs montrent les mocks en action :

```
[Mock Tauri] Command: get_games
Test setup: 15 mock games loaded
  - Installed: 9
  - Not installed: 6
  - By store: Epic=8, GOG=6, Amazon=3
```

## 📊 Jeux disponibles

| ID  | Titre             | Store  | Installé | Play Time |
| --- | ----------------- | ------ | -------- | --------- |
| 1   | DREDGE            | GOG    | ✅       | 37h       |
| 2   | Call of Duty      | Epic   | ❌       | 0h        |
| 3   | Fortnite          | Epic   | ✅       | 80h       |
| 4   | Sea of Thieves    | Amazon | ✅       | 20h       |
| 7   | Red Dead 2        | Epic   | ✅       | 140h      |
| 9   | Black Myth Wukong | Epic   | ✅       | 60h       |
| 12  | Kerbal Space      | GOG    | ✅       | 200h      |
| ... | ...               | ...    | ...      | ...       |
