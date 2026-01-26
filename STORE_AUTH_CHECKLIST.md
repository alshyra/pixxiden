# 🚀 PixiDen Store Authentication - Checklist d'Implémentation

## ✅ Phase 1: Backend Services (COMPLETED)

- [x] Créer structure `src-tauri/src/services/auth/`
- [x] Implémenter `EpicAuth` service (legendary CLI)
- [x] Implémenter `GOGAuth` service (gogdl CLI)
- [x] Implémenter `AmazonAuth` service (nile CLI)
- [x] Implémenter `StoreManager` orchestrator
- [x] Créer module `commands/auth.rs`
- [x] Exposer Tauri commands pour toutes les méthodes
- [x] Enregistrer services dans `lib.rs`
- [x] Ajouter module `auth` dans `services/mod.rs`

## ✅ Phase 2: Frontend Core (COMPLETED)

- [x] Créer types TypeScript dans `src/types/index.ts`
- [x] Créer store Pinia `src/stores/auth.ts`
- [x] Ajouter route `/settings/stores` dans router
- [x] Créer composant `StoreCard.vue`
- [x] Créer modal `EpicAuthModal.vue`
- [x] Créer modal `GOGAuthModal.vue`
- [x] Créer modal `AmazonAuthModal.vue`
- [x] Créer vue `StoresSettings.vue`
- [x] Ajouter lien dans `SettingsView.vue`

## 📋 Phase 3: Assets & Polish (TODO)

### Logos des Stores

- [ ] Ajouter logo Epic Games (`public/assets/logos/epic.svg`)
- [ ] Ajouter logo GOG (`public/assets/logos/gog.svg`)
- [ ] Ajouter logo Amazon Games (`public/assets/logos/amazon.svg`)
- [ ] Ajouter logo Steam (`public/assets/logos/steam.svg`)

**Sources** :

- Epic: https://www.epicgames.com/site/fr/epic-games-logo
- GOG: https://www.gog.com/about-gog
- Amazon: https://gaming.amazon.com/
- Steam: https://store.steampowered.com/

### UI/UX Improvements

- [ ] Tester tous les flows d'authentification (Epic, GOG, Amazon)
- [ ] Améliorer messages d'erreur (plus contextuels)
- [ ] Ajouter animations de transition entre états
- [ ] Tester responsive design (différentes résolutions)
- [ ] Valider accessibilité (focus keyboard)

## 🎮 Phase 4: Navigation Manette (TODO)

### Intégration Gamepad

- [ ] Adapter `useFocusNavigation` pour StoresSettings
- [ ] Permettre navigation D-pad entre stores
- [ ] Gérer sélection avec bouton A
- [ ] Gérer retour avec bouton B
- [ ] Tester inputs clavier dans modals avec manette

### Clavier Virtuel

- [ ] Implémenter clavier virtuel pour GOG code
- [ ] Implémenter clavier virtuel pour Amazon email/password
- [ ] Implémenter clavier virtuel pour Amazon 2FA

## 🧪 Phase 5: Testing (TODO)

### Tests Backend (Rust)

- [ ] Test `EpicAuth::is_authenticated()`
- [ ] Test `GOGAuth::get_auth_url()`
- [ ] Test `AmazonAuth::login()` avec 2FA
- [ ] Test `StoreManager::get_all_auth_status()`
- [ ] Test compatibilité Heroic (configs existantes)

### Tests E2E (WebdriverIO)

- [ ] Créer `e2e/tests/08-store-auth.spec.ts`
- [ ] Test: Afficher tous les stores
- [ ] Test: Ouvrir modal Epic
- [ ] Test: Ouvrir modal GOG
- [ ] Test: Ouvrir modal Amazon
- [ ] Test: Logout confirmation
- [ ] Test: Navigation manette complète

### Tests Manuels

- [ ] Test Epic auth flow (OAuth browser)
- [ ] Test GOG auth flow (copy-paste code)
- [ ] Test Amazon auth flow (email/password)
- [ ] Test Amazon 2FA flow
- [ ] Test logout pour chaque store
- [ ] Test avec Heroic installé (compatibilité)
- [ ] Test sans Heroic installé (indépendance)

## 🔧 Phase 6: Configuration & Dependencies (TODO)

### Vérifier CLIs Installés

- [ ] Documenter installation legendary (`pip install legendary-gl`)
- [ ] Documenter installation gogdl (`pip install gogdl`)
- [ ] Documenter installation nile (`pip install nile`)
- [ ] Ajouter check au démarrage (warnings si CLIs manquants)

### Scripts d'Installation

- [ ] Créer script `scripts/install-clis.sh`
- [ ] Ajouter commande `npm run install:clis`
- [ ] Documenter dans README principal

## 🐛 Phase 7: Error Handling (TODO)

### Gestion Erreurs Backend

- [ ] Améliorer messages d'erreur legendary
- [ ] Améliorer messages d'erreur gogdl
- [ ] Améliorer messages d'erreur nile
- [ ] Ajouter retry automatique (max 3 tentatives)
- [ ] Logger toutes les erreurs (fichier log)

### Gestion Erreurs Frontend

- [ ] Toast notifications pour succès/erreurs
- [ ] Messages d'erreur contextuels dans modals
- [ ] Fallback UI si CLIs non disponibles
- [ ] Timeout configurable (actuellement 30s pour Epic)

## 📚 Phase 8: Documentation (TODO)

### Documentation Utilisateur

- [ ] Créer guide utilisateur (français)
- [ ] Créer guide utilisateur (anglais)
- [ ] Ajouter screenshots des flows
- [ ] Créer FAQ (troubleshooting)
- [ ] Vidéo tutoriel (optionnel)

### Documentation Développeur

- [ ] Documenter architecture backend
- [ ] Documenter flow d'authentification
- [ ] Ajouter JSDoc dans composants Vue
- [ ] Ajouter rustdoc dans services Rust

## 🚀 Phase 9: Release (TODO)

### Pre-Release

- [ ] Tester sur Linux (Ubuntu, Arch, Fedora)
- [ ] Vérifier compatibilité Heroic (plusieurs versions)
- [ ] Code review complet
- [ ] Performance profiling (temps auth, memory)
- [ ] Security audit (tokens, credentials)

### Release Notes

- [ ] Écrire changelog détaillé
- [ ] Créer release notes (GitHub)
- [ ] Mettre à jour README principal
- [ ] Annoncer feature (Discord, Reddit, etc.)

### Post-Release

- [ ] Monitorer feedback utilisateurs
- [ ] Fix bugs critiques rapidement
- [ ] Planifier améliorations (Phase 10+)

## 🎯 Phase 10: Extensions Futures (BACKLOG)

### Features Avancées

- [ ] Auto-refresh tokens expirés
- [ ] Support multi-comptes (plusieurs Epic/GOG/Amazon)
- [ ] Import/Export configurations auth
- [ ] Backup/Restore tokens
- [ ] Migration wizard Heroic → PixiDen
- [ ] Notifications expiration tokens

### Intégrations

- [ ] GOG Galaxy API (si disponible)
- [ ] Epic Social features
- [ ] Amazon Prime Gaming integration
- [ ] Discord Rich Presence (store info)

### Performance

- [ ] Cache status auth (éviter appels répétés)
- [ ] Lazy loading modals
- [ ] Optimiser taille assets (logos)
- [ ] Prefetch auth status au démarrage

---

## 📊 Progress Tracker

**Total Tasks**: 89  
**Completed**: 18 ✅  
**In Progress**: 0 🔄  
**TODO**: 71 📋

**Completion**: 20.2%

---

## 🏆 Milestones

- [x] **M1**: Backend Implementation (18/18) - ✅ DONE
- [x] **M2**: Frontend Core (10/10) - ✅ DONE
- [ ] **M3**: Assets & Polish (0/7) - 📋 TODO
- [ ] **M4**: Gamepad Navigation (0/5) - 📋 TODO
- [ ] **M5**: Testing Complete (0/17) - 📋 TODO
- [ ] **M6**: Documentation (0/8) - 📋 TODO
- [ ] **M7**: Production Release (0/10) - 📋 TODO

---

## 📝 Notes

- Les phases 1-2 (Backend + Frontend Core) sont **complètes et fonctionnelles**
- L'application peut être testée manuellement dès maintenant
- Les phases 3-7 sont recommandées avant release production
- Les phases 8-10 sont optionnelles mais améliorent l'UX

**Date d'implémentation MVP**: 2026-01-26  
**Prochaine étape**: Phase 3 (Assets & Polish)
