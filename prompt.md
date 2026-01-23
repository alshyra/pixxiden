# 🎨 Prompt d'Intégration Design ReMiX dans PixiDen

## 📋 Contexte

PixiDen est un launcher de jeux Linux multi-stores (Epic/GOG/Amazon/Steam) utilisant Tauri 2 + Vue 3 + Pinia. Le projet possède déjà une structure fonctionnelle mais nécessite une refonte UI complète avec le design ReMiX (Pitch Black + Neon Indigo).

---

## 🎯 Objectifs de l'Intégration

### 1. Design System ReMiX
- Palette : Noir pur (#050505) + Indigo néon (#5e5ce6)
- Typographie : Inter (body) + Poppins (display), textes italic/bold
- Glow effects : Lueurs indigo subtiles sur les éléments interactifs
- Animations : Transitions smooth, blur effects, scale transforms

### 2. Navigation Console-Style
- Footer persistant avec légende contextuelle (A/B/S buttons)
- Focus navigation au clavier/manette (D-pad dans les grids)
- Support multi-controller (PS, Xbox, clavier avec détection automatique)
- Overlay Settings par-dessus Library avec blur background

### 3. Architecture Vue Propre
- Routes : Library (/) + Settings (/settings) + GameDetails (/game/:id)
- Stores Pinia existants à conserver
- Commandes Tauri à réutiliser (get_games, sync_games, launch_game, etc.)

---

## 🗂️ Structure Actuelle du Projet

### Router (`src/router/index.ts`)
```typescript
Routes existantes :
- / → LibraryFullscreen.vue
- /library/grid → LibraryGrid.vue
- /game/:id → GameDetails.vue
- /downloads → DownloadsView.vue
- /settings → SettingsView.vue
```

### Types (`src/types/index.ts`)
```typescript
interface Game {
  id: string
  title: string
  store: string // 'steam' | 'epic' | 'gog' | 'amazon'
  installed: boolean
  backgroundUrl?: string // Utiliser celui-ci pour les covers
  playTime?: number
  lastPlayed?: string
  // ... autres champs
}
```

### Store Pinia (`src/stores/library.ts`)
```typescript
Actions disponibles :
- fetchGames() // Récupère tous les jeux
- syncLibrary() // Sync avec les stores
- launchGame(gameId)
- installGame(gameId, installPath?)
- uninstallGame(gameId)
- scanGogInstalled() // Détecte jeux GOG dans ~/GOG Games/
```

### Commandes Tauri Disponibles (`src-tauri/src/commands.rs`)
```rust
#[tauri::command]
- get_games() -> Vec<Game>
- sync_games() -> SyncResult
- launch_game(game_id)
- install_game(game_id, install_path?)
- uninstall_game(game_id)
- get_store_status() -> Vec<StoreStatus>
- scan_gog_installed() -> Vec<Game>
- get_system_info() -> SystemInfo
- get_disk_info() -> Vec<DiskInfo>
- get_settings() -> SettingsConfig
- save_settings(config)
- close_splashscreen()
```

### Composants Existants à Réutiliser
```
src/components/
├── game/
│   ├── GameCard.vue (à refondre)
│   ├── GameOverlay.vue (overlay PS button - garder)
│   └── LaunchOverlay.vue (loader - adapter)
├── layout/
│   ├── TopBar.vue (à supprimer ou adapter)
│   └── BottomFilters.vue (remplacer par footer console)
└── ui/
    ├── Button.vue (adapter au style ReMiX)
    └── Badge.vue (adapter)
```

### Tailwind Config Actuel (`tailwind.config.js`)
```javascript
colors: {
  'remix': {
    'bg-dark': '#000000',
    'bg-card': '#0a0a0a',
    'accent': '#5e5ce6',
    'accent-hover': '#7c7ae8',
    // ... déjà configuré
  }
}
```

---

## 📐 Design ReMiX - Spécifications Détaillées

### 1. Library View - Grid Layout

**Structure HTML cible** :
```html
<div class="library-view">
  <header class="library-header">
    <div class="title-section">
      <h2 class="subtitle">Ma Collection</h2>
      <h1 class="main-title italic">Bibliothèque</h1>
    </div>
    <button class="settings-trigger">Paramètres</button>
  </header>
  
  <div class="games-grid">
    <GameCard v-for="game in games" :game="game" :focused="..." />
  </div>
</div>
```

**Styles clés** :
```css
.library-header {
  padding: 3rem 5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.main-title {
  font-size: 3rem;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.05em;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2rem;
  padding: 0 5rem 5rem;
}

.game-card {
  aspect-ratio: 2/3;
  background: #1a1a1c;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.game-card:hover,
.game-card.focused {
  transform: scale(1.05);
  border-color: #5e5ce6;
  box-shadow: 0 0 30px rgba(94, 92, 230, 0.4);
}
```

**Images** :
- Utiliser `game.backgroundUrl` comme background de la card
- Si absent : Placeholder avec logo Pixxiden + glow indigo
- Gradient overlay en bas pour le titre

---

### 2. Settings View - Overlay Modal

**Comportement** :
- Ouvre en overlay par-dessus Library (route change vers `/settings`)
- Library en arrière-plan : `.view-back` (opacity 0.3, scale 0.92, blur 8px)
- Settings : Sidebar gauche + Contenu principal
- Fermeture : Transition inverse (back to library)

**Structure HTML cible** :
```html
<div class="settings-overlay">
  <aside class="settings-sidebar">
    <div class="logo">Pixxiden</div>
    <nav class="settings-nav">
      <button @click="activeTab = 'system'" :class="{ active: activeTab === 'system' }">
        <span class="indicator"></span>
        Système
      </button>
      <button @click="activeTab = 'accounts'">
        <span class="indicator"></span>
        Comptes
      </button>
      <button @click="activeTab = 'advanced'">
        <span class="indicator"></span>
        Avancé
      </button>
    </nav>
    <button @click="$router.push('/')" class="close-button">Fermer</button>
  </aside>
  
  <main class="settings-content">
    <header class="settings-header">
      <h1 class="glow-title">{{ tabTitle }}</h1>
      <p class="subtitle">{{ tabDescription }}</p>
    </header>
    <div class="tab-content">
      <!-- Contenu dynamique selon l'onglet -->
    </div>
  </main>
</div>
```

**Styles clés** :
```css
.settings-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  gap: 2rem;
  padding: 2rem;
  z-index: 50;
}

.settings-sidebar {
  width: 320px;
  background: rgba(15, 15, 18, 0.98);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.settings-nav button.active {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.settings-nav button.active .indicator {
  width: 4px;
  height: 18px;
  background: #5e5ce6;
  box-shadow: 0 0 15px #5e5ce6;
  border-radius: 4px;
}

.settings-content {
  flex: 1;
  background: rgba(20, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 3rem;
  overflow-y: auto;
}

.glow-title {
  font-size: 4rem;
  font-weight: 900;
  font-style: italic;
  position: relative;
}

.glow-title::before {
  content: '';
  position: absolute;
  top: 60%;
  left: 50%;
  width: 140%;
  height: 80%;
  background: #5e5ce6;
  filter: blur(50px);
  opacity: 0.35;
  z-index: -1;
  transform: translate(-50%, -50%);
}
```

**Contenu des Onglets** :

1. **Système** : 
   - Afficher : OS, Kernel, CPU, Mémoire (via `get_system_info()`)
   - Disques (via `get_disk_info()`)
   - Bouton "Vérifier MAJ" (via `check_for_updates()`)
   - Bouton "Éteindre" (via `shutdown_system()`)

2. **Comptes** :
   - Liste des stores : Epic, GOG, Steam, Amazon
   - Pour chaque : Badge "Connecté" / "Non connecté"
   - Bouton "Connecter" → **TODO** (pas de commande pour l'instant)
   - Message : "Fonctionnalité en développement"

3. **Avancé** :
   - Placeholder vide pour l'instant
   - Message : "Options avancées à venir"

---

### 3. Footer Console Persistant

**Placement** :
- Position: fixed bottom
- Hauteur: 64px
- Visible sur TOUTES les vues
- Background: #050505
- Border-top: 1px solid rgba(255, 255, 255, 0.12)

**Contenu Dynamique** :

```typescript
// Composable pour gérer les boutons du footer
export function useFooterControls() {
  const route = useRoute()
  const controllerType = ref<'keyboard' | 'ps' | 'xbox'>('keyboard')
  
  const buttons = computed(() => {
    const base = []
    
    if (route.name === 'library') {
      base.push(
        { key: 'A', label: 'Sélectionner', action: 'select' },
        { key: 'B', label: 'Retour', action: 'back' },
        { key: 'S', label: 'Paramètres', action: 'settings' }
      )
    } else if (route.name === 'settings') {
      base.push(
        { key: 'A', label: 'Modifier', action: 'edit' },
        { key: 'B', label: 'Retour', action: 'back' },
        { key: 'S', label: 'Fermer', action: 'close' }
      )
    } else if (route.name === 'game-detail') {
      base.push(
        { key: 'A', label: 'Lancer', action: 'play' },
        { key: 'B', label: 'Retour', action: 'back' }
      )
    }
    
    return base
  })
  
  // Détection du type de controller
  function detectController() {
    // TODO: Utiliser Gamepad API pour détecter
    // Pour l'instant, keyboard par défaut
  }
  
  return { buttons, controllerType }
}
```

**Rendu des Boutons** :

```html
<footer class="console-footer">
  <div v-for="btn in buttons" :key="btn.key" class="control-hint">
    <span class="controller-btn" :class="buttonClass(btn.key)">
      {{ getButtonIcon(btn.key, controllerType) }}
    </span>
    <span class="control-label">{{ btn.label }}</span>
  </div>
  
  <div class="status-indicator">
    <div class="status-dot"></div>
    <span>Connecté</span>
  </div>
</footer>
```

**Mapping des Boutons** :
```typescript
const buttonIcons = {
  keyboard: { A: 'A', B: 'B', S: 'S' },
  ps: { A: '✕', B: '○', S: 'SELECT' },
  xbox: { A: 'A', B: 'B', S: 'BACK' }
}
```

---

### 4. Focus Navigation System (D-pad)

**Composable** : `src/composables/useFocusNavigation.ts`

```typescript
import { ref, onMounted, onUnmounted, computed } from 'vue'

export interface Focusable {
  id: string
  element: HTMLElement
  x: number
  y: number
  width: number
  height: number
}

export function useFocusNavigation(gridSelector: string, options = {}) {
  const focusedIndex = ref(0)
  const focusables = ref<Focusable[]>([])
  const gridColumns = ref(5) // Pour library grid
  
  // Calculer les éléments focusables
  function updateFocusables() {
    const elements = document.querySelectorAll(gridSelector)
    focusables.value = Array.from(elements).map((el, index) => {
      const rect = el.getBoundingClientRect()
      return {
        id: el.getAttribute('data-id') || `item-${index}`,
        element: el as HTMLElement,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    })
  }
  
  // Navigation directionnelle
  function navigate(direction: 'up' | 'down' | 'left' | 'right') {
    const current = focusedIndex.value
    let next = current
    
    switch(direction) {
      case 'left':
        next = Math.max(0, current - 1)
        break
      case 'right':
        next = Math.min(focusables.value.length - 1, current + 1)
        break
      case 'up':
        next = Math.max(0, current - gridColumns.value)
        break
      case 'down':
        next = Math.min(focusables.value.length - 1, current + gridColumns.value)
        break
    }
    
    if (next !== current) {
      focusedIndex.value = next
      scrollToFocused()
      playFocusSound() // Optionnel : son de navigation
    }
  }
  
  // Scroll automatique vers l'élément focusé
  function scrollToFocused() {
    const focused = focusables.value[focusedIndex.value]
    if (focused) {
      focused.element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      })
    }
  }
  
  // Keyboard/Gamepad handlers
  function handleKeyDown(e: KeyboardEvent) {
    const keyMap: Record<string, string> = {
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'ArrowUp': 'up',
      'ArrowDown': 'down'
    }
    
    const direction = keyMap[e.key]
    if (direction) {
      e.preventDefault()
      navigate(direction as any)
    }
    
    // Enter pour sélectionner
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const focused = focusables.value[focusedIndex.value]
      if (focused) {
        focused.element.click()
      }
    }
  }
  
  function handleGamepadInput() {
    const gamepads = navigator.getGamepads()
    const gamepad = gamepads[0]
    
    if (!gamepad) return
    
    // D-pad ou stick gauche
    const threshold = 0.5
    
    if (gamepad.axes[0] < -threshold) navigate('left')
    if (gamepad.axes[0] > threshold) navigate('right')
    if (gamepad.axes[1] < -threshold) navigate('up')
    if (gamepad.axes[1] > threshold) navigate('down')
    
    // Bouton X/A pour sélectionner
    if (gamepad.buttons[0].pressed) {
      const focused = focusables.value[focusedIndex.value]
      if (focused) focused.element.click()
    }
  }
  
  // Lifecycle
  onMounted(() => {
    updateFocusables()
    window.addEventListener('keydown', handleKeyDown)
    
    // Poll gamepad à 60fps
    const gamepadInterval = setInterval(handleGamepadInput, 16)
    
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(gamepadInterval)
    })
  })
  
  return {
    focusedIndex,
    focusables,
    navigate,
    updateFocusables
  }
}
```

**Usage dans LibraryView** :
```vue
<template>
  <div class="library-view">
    <div class="games-grid">
      <GameCard 
        v-for="(game, index) in games" 
        :key="game.id"
        :game="game"
        :focused="index === focusedIndex"
        :data-id="game.id"
        class="focusable-game"
      />
    </div>
  </div>
</template>

<script setup>
const { focusedIndex } = useFocusNavigation('.focusable-game', {
  gridColumns: 5
})
</script>
```

---

### 5. Transitions Vue Router

**Configuration** : `src/App.vue`

```vue
<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <transition
        :name="getTransitionName(route)"
        mode="out-in"
        @enter="onEnter"
        @leave="onLeave"
      >
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    
    <ConsoleFooter />
    <GameOverlay ref="gameOverlay" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import ConsoleFooter from '@/components/layout/ConsoleFooter.vue'
import GameOverlay from '@/components/game/GameOverlay.vue'

const route = useRoute()

function getTransitionName(route) {
  // Settings s'ouvre en overlay avec blur background
  if (route.name === 'settings') return 'settings-overlay'
  // Autres vues : fade simple
  return 'fade'
}

function onEnter(el) {
  // Animation custom si besoin
}

function onLeave(el, done) {
  // Animation custom si besoin
  done()
}
</script>

<style>
/* Transition Settings Overlay */
.settings-overlay-enter-active,
.settings-overlay-leave-active {
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.settings-overlay-enter-from {
  opacity: 0;
  transform: scale(1.05) translateZ(0);
  filter: blur(15px);
}

.settings-overlay-leave-to {
  opacity: 0;
  transform: scale(1.05) translateZ(0);
  filter: blur(15px);
}

/* Effet sur Library quand Settings ouverts */
.library-view.blurred {
  opacity: 0.3;
  transform: scale(0.92) translateZ(0);
  filter: grayscale(0.8) blur(8px);
  pointer-events: none;
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Fade simple pour les autres vues */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

---

### 6. GameCard Component - Refonte

**Fichier** : `src/components/game/GameCard.vue`

```vue
<template>
  <div 
    class="game-card"
    :class="{ focused: focused }"
    :style="{ backgroundImage: `url(${game.backgroundUrl || defaultBackground})` }"
    @click="$emit('select', game)"
    @dblclick="$emit('open', game)"
  >
    <!-- Gradient overlay -->
    <div class="card-overlay"></div>
    
    <!-- Store badge -->
    <div class="store-badge" :class="`store-${game.store}`">
      {{ game.store.toUpperCase() }}
    </div>
    
    <!-- Title -->
    <div class="card-title">
      {{ game.title }}
    </div>
    
    <!-- Installed indicator -->
    <div v-if="game.installed" class="installed-badge">
      ✓ Installé
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Game } from '@/types'

interface Props {
  game: Game
  focused?: boolean
}

const props = defineProps<Props>()
defineEmits(['select', 'open'])

// Default background avec logo Pixxiden + glow
const defaultBackground = computed(() => {
  return '/placeholder-game-bg.png' // Créer cette image
})
</script>

<style scoped>
.game-card {
  aspect-ratio: 2/3;
  background-color: #1a1a1c;
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  cursor: pointer;
}

.game-card:hover,
.game-card.focused {
  transform: scale(1.05);
  border-color: #5e5ce6;
  box-shadow: 0 0 30px rgba(94, 92, 230, 0.4);
  z-index: 10;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.95), transparent);
}

.store-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  z-index: 2;
}

.store-steam { background: #1b2838; color: #66c0f4; }
.store-epic { background: #2a2a2a; color: #fff; }
.store-gog { background: #722ed1; color: #fff; }
.store-amazon { background: #ff9900; color: #000; }

.card-title {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  font-size: 14px;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  color: white;
  z-index: 2;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
}

.installed-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 8px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.5);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #10b981;
  z-index: 2;
}
</style>
```

---

### 7. Placeholder Image - Logo Pixxiden avec Glow

**Fichier à créer** : `public/placeholder-game-bg.png`

**Spécifications** :
- Dimensions : 600x900px (ratio 2:3)
- Background : Dégradé noir (#000) vers gris très sombre (#0a0a0a)
- Logo Pixxiden centré (hexagone PX du splash)
- Glow indigo autour (#5e5ce6 avec blur 60px, opacity 0.25)
- Texte en bas : "Aucune image disponible" en petit (Inter, 12px, gris)

**Alternative temporaire** : SVG inline dans le component
```vue
<template>
  <div v-if="!game.backgroundUrl" class="placeholder-bg">
    <svg class="placeholder-logo" width="80" height="80" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#5e5ce6" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <path 
        d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" 
        fill="none" 
        stroke="url(#glow-grad)" 
        stroke-width="3"
      />
      <text x="50" y="62" text-anchor="middle" font-size="24" font-weight="900" fill="white">
        PX
      </text>
    </svg>
    <div class="glow-effect"></div>
  </div>
</template>

<style>
.placeholder-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #000 0%, #0a0a0a 100%);
}

.glow-effect {
  position: absolute;
  width: 120px;
  height: 120px;
  background: #5e5ce6;
  filter: blur(60px);
  opacity: 0.25;
  z-index: 0;
}

.placeholder-logo {
  position: relative;
  z-index: 1;
}
</style>
```

---

## 📝 Ordre d'Implémentation Recommandé

### Phase 1 : Foundation (1-2h)
1. ✅ Mettre à jour `tailwind.config.js` si besoin (déjà OK)
2. ✅ Créer `src/components/layout/ConsoleFooter.vue`
3. ✅ Créer `src/composables/useFooterControls.ts`
4. ✅ Ajouter footer dans `App.vue`

### Phase 2 : Library View (2-3h)
5. ✅ Refondre `GameCard.vue` avec le nouveau style
6. ✅ Créer le placeholder image (SVG inline ou PNG)
7. ✅ Réécrire `LibraryFullscreen.vue` avec la nouvelle structure
8. ✅ Créer `src/composables/useFocusNavigation.ts`
9. ✅ Intégrer focus navigation dans Library

### Phase 3 : Settings Overlay (2-3h)
10. ✅ Réécrire `SettingsView.vue` avec sidebar + onglets
11. ✅ Implémenter les 3 onglets (Système, Comptes, Avancé)
12. ✅ Ajouter les transitions CSS (overlay + blur background)
13. ✅ Gérer le routing avec effet overlay

### Phase 4 : Polish & Testing (1-2h)
14. ✅ Tester navigation clavier dans Library grid
15. ✅ Tester transitions Library ↔ Settings
16. ✅ Vérifier footer sur toutes les vues
17. ✅ Ajouter sons de navigation (optionnel)
18. ✅ Test gamepad si disponible

---

## 🎯 Critères de Succès

### Visuel
- [ ] Palette ReMiX respectée (noir pur + indigo néon)
- [ ] Glow effects subtils et élégants
- [ ] Typographie italic/bold cohérente
- [ ] Placeholder Pixxiden avec glow si pas d'image

### Navigation
- [ ] D-pad/flèches naviguent dans la grid
- [ ] Enter/X ouvre GameDetails
- [ ] Footer change selon la vue active
- [ ] Détection controller (PS/Xbox/Clavier)

### Transitions
- [ ] Settings s'ouvre en smooth overlay
- [ ] Library blur en background quand Settings ouverts
- [ ] Transitions non bloquantes (<600ms)

### Fonctionnel
- [ ] Store Pinia fonctionne toujours
- [ ] Commandes Tauri appellées correctement
- [ ] Pas de régression sur les features existantes

---

## 🚨 Pièges à Éviter

1. **Ne pas casser le store Pinia** : Garder les mêmes actions/getters
2. **Ne pas bloquer les commandes Tauri** : Toujours async/await
3. **Performance focus navigation** : Throttle gamepad polling (16ms max)
4. **Z-index hell** : Footer (100), Settings (50), Overlay (40)
5. **Transitions trop lentes** : Max 600ms pour l'UX console
6. **Oublier le fallback image** : Toujours gérer `!backgroundUrl`

---

## 📦 Fichiers à Créer/Modifier

### Nouveaux Fichiers
```
src/
├── components/
│   └── layout/
│       └── ConsoleFooter.vue (NOUVEAU)
├── composables/
│   ├── useFocusNavigation.ts (NOUVEAU)
│   └── useFooterControls.ts (NOUVEAU)
└── assets/
    └── placeholder-game-bg.png (NOUVEAU - optionnel)
```

### Fichiers à Modifier
```
src/
├── App.vue (ajouter footer + transitions)
├── views/
│   ├── LibraryFullscreen.vue (refonte complète)
│   └── SettingsView.vue (refonte complète)
└── components/
    └── game/
        └── GameCard.vue (refonte style)
```

---

## 🎨 Assets de Référence

**Design HTML source** : `ref.html` (fourni)
- Contient tous les styles CSS à adapter
- Animations et transitions de référence
- Structure HTML cible

**Splash actuel** : `src/views/SplashScreen.vue`
- Identité visuelle à reprendre (glow violet/indigo)
- Logo hexagone "PX" comme base du placeholder

---

## ✅ Validation Finale

Avant de considérer l'intégration terminée :

1. **Visual check** : Screenshot de chaque vue comparé au design HTML
2. **Navigation test** : 
   - Clavier : Flèches + Enter fonctionne
   - Manette : D-pad + X fonctionne (si dispo)
3. **Transitions test** :
   - Library → Settings (smooth overlay)
   - Settings → Library (smooth back)
4. **Footer test** : Boutons changent selon la vue
5. **Performance** : Pas de lag dans la grid (60fps)
6. **Responsive** : Grid s'adapte (5 cols desktop, 3 cols medium, 2 cols mobile)

---

## 📞 Support

Si des questions surviennent pendant l'implémentation :
- **Types manquants** : Voir `src/types/index.ts`
- **Commandes Tauri** : Voir `src-tauri/src/commands.rs`
- **Store actions** : Voir `src/stores/library.ts`
- **Design ref** : Voir `ref.html` et `SplashScreen.vue`

**Objectif** : Une interface console élégante, fluide, et fonctionnelle qui respecte l'identité Pixxiden (glow indigo) tout en offrant une UX manette/clavier impeccable. 🎮✨