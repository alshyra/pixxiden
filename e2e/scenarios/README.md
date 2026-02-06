# Test Scenarios

Tests E2E organisés par scénario, utilisant le pattern Page Object Model.

## Structure

```
e2e/
├── page-objects/           # Page Object Model - abstraction des pages
│   ├── APIKeysModal.ts     # Modal de configuration des clés API
│   ├── LibraryPage.ts      # Page de la bibliothèque de jeux
│   ├── SettingsPage.ts     # Page de configuration (navigation tabs)
│   ├── StoreSettingsPage.ts # Page de configuration des stores
│   └── index.ts            # Exports centralisés
│
├── scenarios/              # Scénarios de test (un fichier par scénario)
│   ├── 01-api-keys-setup.spec.ts        # Configuration initiale des clés API
│   ├── 02-store-configuration.spec.ts   # Configuration des stores
│   ├── 03-epic-authentication.spec.ts   # Authentification Epic Games
│   └── 04-library-games.spec.ts         # Chargement et affichage des jeux
│
└── helpers/                # Helpers partagés
    └── index.ts            # waitForAppReady, etc.
```

## Scénarios

Chaque scénario est **indépendant** et peut être exécuté en isolation ou en parallèle.
Chaque scénario contient **un seul test significatif** au niveau métier.

### 01 - API Keys Setup

**Test** : `should show API keys modal and allow skipping configuration`

Teste le flow initial de configuration des clés API :

1. Attendre que l'app soit prête
2. Vérifier l'affichage du modal (si applicable)
3. Ignorer la configuration
4. Vérifier que l'app répond

### 02 - Store Configuration & Authentication

**Test** : `should configure Epic Games store and verify authentication flow`

Teste la configuration et authentification d'un store (Epic Games) :

1. Attendre que l'app soit prête
2. Vérifier la redirection vers settings/store (quand pas de stores)
3. Naviguer vers l'onglet "Comptes"
4. Vérifier l'affichage de l'UI de configuration
5. Cliquer sur le bouton "CONNEXION" d'Epic Games
6. Vérifier que le flow d'authentification est déclenché
7. Vérifier le statut de connexion après 3 secondes

### 04 - Library & Games

**Test** : `should display library and load games if configured`

Teste l'affichage de la bibliothèque et le chargement des jeux :

1. Attendre que l'app soit prête
2. Naviguer vers la page d'accueil de la bibliothèque
3. Vérifier l'existence de l'UI de la bibliothèque
4. Vérifier l'état des jeux (empty state ou games UI)
5. Vérifier la réactivité de l'app

## Page Objects

### APIKeysModal

Interactions avec le modal de configuration des clés API :

- `isShown()` - Vérifie si le modal est affiché
- `clickSkip()` - Clique sur "Passer"
- `clickConfigure()` - Clique sur "Configurer"

### SettingsPage

Navigation dans les paramètres :

- `navigateToTab(tabName)` - Navigue vers un onglet spécifique
- `navigateToStoreSettings()` - Va directement à l'onglet Comptes
- `isOnSettings()` - Vérifie si on est sur la page settings
- `takeScreenshot(name)` - Capture d'écran

### StoreSettingsPage

Gestion des connexions aux stores :

- `findStoreConnectionButton(storeName)` - Trouve le bouton de connexion d'un store
- `clickStoreConnection(storeName)` - Clique sur connexion pour un store
- `hasStore(storeName)` - Vérifie si un store est affiché
- `isStoreConnected(storeName)` - Vérifie si un store est connecté
- `isStoreDisconnected(storeName)` - Vérifie si un store est déconnecté

### LibraryPage

Interactions avec la bibliothèque :

- `hasEmptyState()` - Vérifie l'état vide (pas de jeux)
- `hasGamesUI()` - Vérifie la présence de l'UI des jeux
- `hasLibraryUI()` - Vérifie que l'UI de la bibliothèque est affichée
- `navigateHome()` - Va à l'accueil
- `isRedirectedToSettings()` - Vérifie la redirection vers settings

## Lancer les tests

```bash
# Tous les scénarios
bun run test:e2e

# Un scénario spécifique
bun run test:e2e --spec e2e/scenarios/01-api-keys-setup.spec.ts
bun run test:e2e --spec e2e/scenarios/02-store-configuration.spec.ts
bun run test:e2e --spec e2e/scenarios/03-epic-authentication.spec.ts
bun run test:e2e --spec e2e/scenarios/04-library-games.spec.ts
```

## Avantages du Pattern Page Object Model

1. **Maintenance facilitée** : Les changements d'UI ne nécessitent que des modifications dans les page objects
2. **Réutilisabilité** : Les méthodes des page objects sont réutilisables entre scénarios
3. **Lisibilité** : Les tests sont plus lisibles, focalisés sur le comportement métier
4. **Séparation des responsabilités** : Logique d'interaction séparée de la logique de test
