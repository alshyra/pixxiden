# Testing Best Practices (Pixxiden)

Ce guide formalise les conventions de tests du projet pour garder des suites fiables, rapides et faciles à maintenir.

## 1) Structure recommandée

- Tester **la logique métier** en priorité (`src/services`, `src/stores`, `src/lib`).
- Garder les tests de composants ciblés sur le comportement utilisateur (pas sur l'implémentation interne).
- Nommer les fichiers selon la portée:
  - `tests/services/*.spec.ts` pour les services
  - `tests/stores/*.spec.ts` pour les stores Pinia
  - `tests/components/*.spec.ts` pour les composants Vue

## 2) AAA + scénarios métiers

Utiliser systématiquement le pattern **Arrange / Act / Assert**:

1. Arrange: configurer mocks et données
2. Act: exécuter l'action à tester
3. Assert: vérifier état, appels et erreurs

Préférer des descriptions orientées métier:
- ✅ `should map 2FA required into user-friendly error`
- ❌ `should call function X`

## 3) Mocks: principes

- Mocker uniquement les frontières externes: Tauri `invoke`, sidecars, FS, HTTP.
- Éviter de mocker la logique que l'on veut réellement tester.
- Réinitialiser les mocks à chaque test (`beforeEach` + `vi.clearAllMocks()`).
- Centraliser les helpers de mocks dans `tests/helpers/` (ex: `service-test-utils.ts`).

## 4) Stores Pinia

- Toujours initialiser Pinia dans chaque test:
  - `setActivePinia(createPinia())`
- Tester:
  - état initial
  - transitions de loading/error
  - branches succès/échec
  - computed exposés

## 5) Gestion d’erreurs

Pour chaque méthode publique, couvrir au moins:

- chemin nominal (succès)
- une erreur de dépendance (throw/reject)
- comportement de fallback attendu (si existant)

## 6) Coverage pragmatique

Objectif pratique: augmenter la couverture sur les zones critiques avant de viser l'exhaustif UI.

Priorités recommandées:

1. Services d’orchestration
2. Stores métier
3. Wrappers API
4. Composants UI complexes

## 7) Anti-patterns à éviter

- Assertions trop couplées aux détails internes
- `expect(true).toBe(true)` / tests sans valeur
- Trop de logique dans les mocks
- Tests dépendants de l’ordre d’exécution

## 8) Workflow local conseillé

```bash
bun run test:run
bun run test:coverage
```

Pour itérer vite sur un fichier de test, exécuter seulement le fichier concerné avec Vitest.

## 9) Checklist avant merge

- Le test échoue sans le fix
- Le test passe avec le fix
- Les messages d’échec sont explicites
- Pas de dépendance réseau réelle en unit tests
- Couverture augmentée ou au minimum non régressive
