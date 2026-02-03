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

### 01 - API Keys Setup

- Vérification de l'affichage du modal de configuration des clés API
- Test du bouton "Passer" pour ignorer la configuration

### 02 - Store Configuration

- Redirection vers settings/store quand aucun store configuré
- Navigation vers l'onglet "Comptes"
- Affichage des options de connexion (Epic, GOG, Amazon, Steam)

### 03 - Epic Authentication

- Clic sur le bouton de connexion Epic Games
- Déclenchement du flow OAuth (webview interne Tauri)
- Vérification du statut de connexion

### 04 - Library & Games

- Vérification du chargement des jeux
- Affichage de l'UI de la bibliothèque

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
