# 🤝 Contribuer à l'Authentification des Stores

Merci de votre intérêt pour contribuer à PixiDen ! Ce guide vous aidera à comprendre comment contribuer à la fonctionnalité d'authentification des stores.

## 📋 Avant de Commencer

### Prérequis

- Node.js 18+
- Rust (pour Tauri)
- CLIs installés : `legendary-gl`, `gogdl`, `nile`
- Comptes de test sur Epic, GOG, Amazon (optionnel)

### Vérifier l'Installation

```bash
# Vérifier CLIs
./scripts/check-clis.sh

# Installer si manquants
pip install legendary-gl gogdl nile
```

## 🏗️ Architecture

```
Backend (Rust)              Frontend (Vue 3)
================            ==================
services/auth/              stores/auth.ts
├── epic.rs                 views/
├── gog.rs                  └── StoresSettings.vue
├── amazon.rs               components/settings/
└── store_manager.rs        ├── StoreCard.vue
                            ├── EpicAuthModal.vue
commands/auth.rs            ├── GOGAuthModal.vue
                            └── AmazonAuthModal.vue
```

## 🐛 Rapporter un Bug

### Informations à Fournir

1. **Store concerné** : Epic/GOG/Amazon
2. **Flow** : Login/Logout/Status check
3. **Système** : Linux distro, version
4. **CLIs versions** : `legendary --version`, etc.
5. **Logs** : Console errors, Tauri logs
6. **Étapes de reproduction**

### Exemple de Bug Report

```markdown
**Store**: Epic Games
**Flow**: OAuth Login
**System**: Ubuntu 22.04

**Description**: Epic auth modal stays on "Opening browser..." forever

**Steps to Reproduce**:

1. Go to Settings → Stores
2. Click "Se connecter" on Epic Games
3. Modal opens but browser never opens
4. Timeout after 30s

**Logs**:
```

Error: Failed to launch legendary: legendary not found

```

**Expected**: Browser opens with Epic login page
**Actual**: Timeout error
```

## 🔧 Contribuer du Code

### 1. Ajouter Support d'un Nouveau Store

**Exemple** : Ajouter support Uplay/Ubisoft

#### Backend (Rust)

```rust
// src-tauri/src/services/auth/ubisoft.rs
pub struct UbisoftAuth {
    config_path: PathBuf,
}

impl UbisoftAuth {
    pub async fn is_authenticated(&self) -> bool {
        // Check config file
    }

    pub async fn start_auth(&self) -> Result<(), String> {
        // Launch ubisoft CLI auth
    }

    // ... autres méthodes
}
```

#### Frontend (Vue)

```vue
<!-- src/components/settings/UbisoftAuthModal.vue -->
<template>
  <div class="modal-overlay">
    <!-- UI flow d'authentification -->
  </div>
</template>

<script setup lang="ts">
// Logic
</script>
```

### 2. Améliorer UI/UX

**Exemples de contributions** :

- Améliorer messages d'erreur (plus contextuels)
- Ajouter animations transitions
- Améliorer responsive design
- Optimiser loading states
- Ajouter tooltips explicatifs

### 3. Ajouter Tests

#### Tests E2E (WebdriverIO)

```typescript
// e2e/tests/08-store-auth.spec.ts
describe("Store Authentication", () => {
  it("should display all stores", async () => {
    await browser.url("/settings/stores");

    const epicCard = await $('[data-store="epic"]');
    await expect(epicCard).toBeDisplayed();

    // ... autres assertions
  });
});
```

#### Tests Unitaires (Rust)

```rust
// src-tauri/src/services/auth/epic.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_epic_auth_with_existing_config() {
        // Setup mock config file
        // Test is_authenticated()
        // Assert result
    }
}
```

### 4. Améliorer Documentation

- Traduire en anglais (`STORE_AUTH_EN.md`)
- Ajouter screenshots/GIFs
- Créer vidéo tutoriel
- Améliorer JSDoc/rustdoc

## 🎨 Guidelines

### Code Style

**Rust**

```rust
// ✅ Bon
pub async fn login(&self, email: &str) -> Result<(), AuthError> {
    // Implementation
}

// ❌ Mauvais
pub async fn DoLogin(&self, Email: String) -> Result<(), String> {
    // Implementation
}
```

**TypeScript**

```typescript
// ✅ Bon
const handleConnect = async (store: StoreType) => {
  await authStore.loginEpic();
};

// ❌ Mauvais
const handleconnect = async (store) => {
  await authStore.loginEpic();
};
```

**Vue**

```vue
<!-- ✅ Bon -->
<template>
  <div class="store-card">
    <h3>{{ storeName }}</h3>
  </div>
</template>

<!-- ❌ Mauvais -->
<template>
  <div class="StoreCard">
    <h3>{{ store_name }}</h3>
  </div>
</template>
```

### Commits

**Format** : `type(scope): message`

```bash
# ✅ Bon
git commit -m "feat(auth): add Ubisoft store support"
git commit -m "fix(epic): handle browser timeout gracefully"
git commit -m "docs(auth): add English translation"

# ❌ Mauvais
git commit -m "added stuff"
git commit -m "fix bug"
```

**Types** :

- `feat` : Nouvelle feature
- `fix` : Bug fix
- `docs` : Documentation
- `style` : Formatting, missing semicolons, etc.
- `refactor` : Code restructuring
- `test` : Adding tests
- `chore` : Maintenance

## 🧪 Tester Localement

### Backend

```bash
cd src-tauri
cargo build
cargo test
```

### Frontend

```bash
npm run dev
# Navigate to http://localhost:1420/settings/stores
```

### E2E

```bash
npm run e2e:run
```

## 📝 Checklist PR

Avant de soumettre une Pull Request :

- [ ] Code compile sans erreurs (`cargo build` + `npm run build`)
- [ ] Tests passent (`cargo test` + `npm run test`)
- [ ] Linting OK (`npm run lint`)
- [ ] Documentation mise à jour
- [ ] CHANGELOG.md mis à jour
- [ ] Screenshots ajoutés (si UI change)
- [ ] Testé manuellement sur Linux
- [ ] Commit messages clairs

## 🎯 Priorités de Contribution

### 🔥 High Priority

1. **Assets** : Logos réels des stores (Epic, GOG, Amazon, Steam)
2. **Tests E2E** : Coverage complet des flows d'auth
3. **Error Handling** : Messages plus contextuels
4. **Gamepad** : Navigation complète + tests

### 🟡 Medium Priority

5. **Clavier Virtuel** : Pour inputs dans modals
6. **Retry Logic** : Auto-retry sur erreurs temporaires
7. **Traduction** : Support i18n (anglais)
8. **Animations** : Transitions plus smooth

### 🟢 Low Priority

9. **Multi-Comptes** : Support plusieurs comptes par store
10. **Export/Import** : Backup configurations
11. **Auto-Refresh** : Refresh tokens automatique

## 💡 Idées de Features

**Vous avez une idée ?** Ouvrez une issue avec :

```markdown
**Feature**: [Titre court]

**Description**: Qu'est-ce que vous voulez ajouter ?

**Use Case**: Pourquoi c'est utile ?

**Implementation**: Comment vous envisagez l'implémentation ?

**Alternatives**: Autres approches possibles ?
```

## 🤝 Code Review

### Ce qu'on Regarde

- ✅ **Fonctionnalité** : Ça marche comme prévu ?
- ✅ **Code Quality** : Lisible, maintenable ?
- ✅ **Tests** : Coverage suffisant ?
- ✅ **Performance** : Pas de régressions ?
- ✅ **Security** : Pas de failles ?
- ✅ **UX** : Intuitive, accessible ?

### Timeline

- **Review Initial** : 1-3 jours
- **Feedback** : Discussions iteratives
- **Merge** : Après approval + CI pass

## 📚 Resources

### Documentation

- [STORE_AUTH.md](STORE_AUTH.md) - Feature complète
- [STORE_AUTH_CHECKLIST.md](STORE_AUTH_CHECKLIST.md) - Checklist
- [Tauri Docs](https://tauri.app/v1/guides/)
- [Vue 3 Docs](https://vuejs.org/)
- [Pinia Docs](https://pinia.vuejs.org/)

### CLIs

- [Legendary CLI](https://github.com/derrod/legendary)
- [GOGdl](https://github.com/Heroic-Games-Launcher/heroic-gogdl)
- [Nile CLI](https://github.com/imLinguin/nile)

## 💬 Communication

### Où Nous Trouver ?

- **GitHub Issues** : Bugs, features, questions
- **Pull Requests** : Code contributions
- **Discussions** : Questions générales, idées

### Code de Conduite

- 🤝 Soyez respectueux et inclusif
- 💡 Encouragez la collaboration
- 🎯 Restez focus sur le projet
- 🐛 Donnez du feedback constructif

## 🎉 Remerciements

Merci à tous les contributeurs qui rendent PixiDen meilleur !

**Contributors** :

- GitHub Copilot (Initial implementation)
- [Votre nom ici !]

---

**Questions ?** Ouvrez une issue avec le label `question` 💬
