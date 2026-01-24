# Mode Mock - Documentation

Le mode mock permet de tester et développer l'application avec des données fictives sans avoir besoin d'une connexion aux stores (GOG, Epic, etc.) ni de jeux réellement installés.

## Activation du mode mock

### 1. Via localStorage (développement)

Ouvrir la console du navigateur (F12) et exécuter :
```javascript
localStorage.setItem('PIXXIDEN_MOCK_MODE', 'true')
```

Puis recharger l'application.

### 2. Via paramètre URL

Lancer l'application avec le paramètre `?mock` :
```
http://localhost:5173/?mock
```

### 3. Automatique dans les tests E2E

Le mode mock est **automatiquement activé** dans tous les tests E2E via le hook `before` dans `wdio.conf.ts`.

Aucune configuration supplémentaire n'est nécessaire.

## Données Mock

Les données mock sont définies dans [`e2e/fixtures/mockGames.ts`](../e2e/fixtures/mockGames.ts).

Ce fichier contient :
- **15 jeux fictifs** avec des données réalistes
- Des jeux de différents stores (GOG, Epic, Amazon)
- Des jeux installés et non installés
- Des statistiques de temps de jeu et dates de dernière partie
- Des URLs d'images de jackets

### Fonctions utilitaires

```typescript
import { 
  mockGames,           // Tous les jeux
  getGamesByStore,     // Filtrer par store
  getInstalledGames,   // Jeux installés
  getNotInstalledGames,// Jeux non installés
  getGameById,         // Trouver un jeu par ID
  getRecentlyPlayedGames, // Jeux récents (30 jours)
  storeStats          // Statistiques
} from '@/e2e/fixtures/mockGames'
```

## API affectées en mode mock

Quand le mode mock est activé, les fonctions suivantes retournent des données fictives :

- ✅ `getGames()` - Retourne les 15 jeux mock
- ✅ `syncGames()` - Simule une synchronisation réussie
- ⚠️ `launchGame()` - Fonctionne normalement (appelle Tauri)
- ⚠️ `installGame()` - Fonctionne normalement (appelle Tauri)
- ⚠️ `uninstallGame()` - Fonctionne normalement (appelle Tauri)

> **Note** : Les opérations de lancement/installation/désinstallation ne sont pas mockées car elles nécessitent des interactions système réelles.

## Désactivation du mode mock

### En développement
```javascript
localStorage.removeItem('PIXXIDEN_MOCK_MODE')
```

Puis recharger l'application.

### En tests E2E

Le mode mock est automatiquement désactivé à la fin de chaque session de test.

## Avantages du mode mock

1. **Tests rapides** : Pas besoin de connexion aux stores
2. **Données prévisibles** : Toujours les mêmes jeux pour les tests
3. **Développement offline** : Pas besoin de configuration des stores
4. **Isolation** : Les tests ne dépendent pas de l'état réel du système
5. **Débogage facile** : Données contrôlées et traçables

## Ajout de nouveaux jeux mock

Pour ajouter des jeux mock, éditer [`e2e/fixtures/mockGames.ts`](../e2e/fixtures/mockGames.ts) :

```typescript
export const mockGames: Game[] = [
  // ... jeux existants
  {
    id: '16',
    title: 'Nouveau Jeu',
    store: 'epic',
    storeId: 'epic',
    appId: 'nouveau-jeu-epic',
    installed: true,
    installPath: '/games/nouveaujeu',
    executablePath: '/games/nouveaujeu/game.exe',
    playTime: 1200,
    lastPlayed: '2025-01-20',
    backgroundUrl: 'https://example.com/image.webp'
  }
]
```

## Logs et Débogage

En mode mock, tous les appels API logguent un message avec le préfixe `[MOCK MODE]` :

```
🎮 [MOCK MODE] Returning mock games: 15
🎮 [MOCK MODE] Syncing mock games
```

Chercher ces logs dans la console pour confirmer que le mode mock est actif.
