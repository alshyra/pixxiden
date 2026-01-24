# 📚 Guide d'utilisation des composants UI

Ce document explique comment utiliser les composants de la bibliothèque UI PixiDen pour éviter la duplication de code.

## 🎯 Principe

**Ne jamais utiliser** les éléments HTML natifs (`<button>`, `<select>`, etc.) directement dans les composants. Toujours utiliser les composants UI centralisés.

## 📦 Import

```typescript
import { Button, Select, Toggle, Modal, Tabs, Dropdown, Badge } from '@/components/ui'
import type { SelectOption, TabItem, DropdownItem } from '@/components/ui'
```

## 🔘 Button

**Remplace** : `<button>`

### Variants disponibles
- `primary` - Bouton principal (indigo avec glow)
- `danger` - Actions destructives (rouge)
- `ghost` - Bouton transparent
- `outline` - Bordure uniquement

### Sizes
- `sm` - Petit (px-3 py-2)
- `md` - Moyen (px-5 py-3) [default]
- `lg` - Grand (px-6 py-4)

### Usage

```vue
<!-- ❌ Avant (ne PAS faire) -->
<button 
  @click="save"
  class="px-5 py-3 bg-[#5e5ce6] rounded-xl text-white hover:bg-[#7c7ae8]"
>
  Sauvegarder
</button>

<!-- ✅ Après (FAIRE) -->
<Button variant="primary" size="lg" @click="save">
  <template #icon>
    <CheckIcon class="w-5 h-5" />
  </template>
  Sauvegarder
</Button>

<!-- Avec loading state -->
<Button variant="primary" :loading="saving" @click="save">
  Enregistrer
</Button>

<!-- Bouton danger -->
<Button variant="danger" @click="deleteGame">
  <template #icon>
    <TrashIcon />
  </template>
  Supprimer
</Button>
```

## 📝 Select

**Remplace** : `<select>` + `<option>`

### Usage

```vue
<!-- ❌ Avant -->
<select v-model="protonVersion" class="...">
  <option value="v1">Version 1</option>
  <option value="v2">Version 2</option>
</select>

<!-- ✅ Après -->
<Select 
  v-model="protonVersion" 
  :options="protonVersions"
  placeholder="Sélectionner une version"
/>

<script setup lang="ts">
import type { SelectOption } from '@/components/ui'

const protonVersions: SelectOption[] = [
  { value: 'v1', label: 'Version 1' },
  { value: 'v2', label: 'Version 2' },
]
</script>
```

## 🔀 Toggle

**Remplace** : `<button role="switch">` ou checkbox customisé

### Usage

```vue
<!-- ❌ Avant -->
<button 
  @click="enabled = !enabled"
  class="relative w-[52px] h-7 rounded-full"
  :class="enabled ? 'bg-[#5e5ce6]' : 'bg-white/10'"
>
  <span :class="enabled ? 'translate-x-6' : 'translate-x-0.5'" />
</button>

<!-- ✅ Après -->
<Toggle 
  v-model="enabled"
  label="Activer MangoHud"
/>
```

## 🪟 Modal

**Remplace** : Overlays/dialogs customisés

### Usage

```vue
<template>
  <Button @click="showModal = true">Ouvrir</Button>
  
  <Modal 
    v-model="showModal" 
    title="Confirmer l'action"
    description="Cette action est irréversible"
    size="md"
  >
    <p>Êtes-vous sûr de vouloir continuer ?</p>
    
    <template #footer>
      <Button variant="ghost" @click="showModal = false">Annuler</Button>
      <Button variant="danger" @click="confirm">Confirmer</Button>
    </template>
  </Modal>
</template>
```

## 📑 Tabs

**Remplace** : Navigation par onglets customisée

### Usage

```vue
<template>
  <Tabs :tabs="sections" label="CONFIGURATION" v-model="activeTab">
    <template #systeme>
      <!-- Contenu onglet Système -->
    </template>
    <template #comptes>
      <!-- Contenu onglet Comptes -->
    </template>
  </Tabs>
</template>

<script setup lang="ts">
import type { TabItem } from '@/components/ui'

const sections: TabItem[] = [
  { id: 'systeme', label: 'Système', icon: '⚙️' },
  { id: 'comptes', label: 'Comptes', icon: '👤' },
]

const activeTab = ref('systeme')
</script>
```

## 📋 Dropdown

**Remplace** : Menus contextuels

### Usage

```vue
<template>
  <Dropdown :items="actions" align="right">
    <template #trigger>
      <!-- Custom trigger (optionnel) -->
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import type { DropdownItem } from '@/components/ui'

const actions: DropdownItem[] = [
  { label: 'Lancer', action: () => launch(), iconString: '▶️' },
  { label: 'Paramètres', action: () => settings(), iconString: '⚙️' },
  { label: 'Désinstaller', action: () => uninstall(), danger: true, iconString: '🗑️' },
]
</script>
```

## 🏷️ Badge

**Remplace** : Spans avec classes customisées pour labels

### Variants
- `steam`, `epic`, `gog`, `amazon` - Store badges
- `installed` - Statut installé
- `success`, `error` - Statuts généraux
- `default` - Badge neutre

### Usage

```vue
<!-- ❌ Avant -->
<span class="px-2 py-1 bg-[#1b2838] text-[#66c0f4] rounded text-xs">
  STEAM
</span>

<!-- ✅ Après -->
<Badge variant="steam" label="STEAM" />

<!-- Ou avec slot -->
<Badge variant="installed">✓ INSTALLÉ</Badge>
```

## 🎨 Personnalisation

Tous les composants acceptent des classes Tailwind supplémentaires :

```vue
<Button 
  variant="primary" 
  class="w-full mb-4"  <!-- Classes supplémentaires -->
  @click="action"
>
  Texte
</Button>
```

## ✅ Checklist de migration

Quand vous créez ou modifiez un composant :

- [ ] Pas de `<button>` natifs → utiliser `<Button>`
- [ ] Pas de `<select>` natifs → utiliser `<Select>`
- [ ] Pas de switches customisés → utiliser `<Toggle>`
- [ ] Pas de modals customisés → utiliser `<Modal>`
- [ ] Pas de tabs customisés → utiliser `<Tabs>`
- [ ] Pas de dropdowns customisés → utiliser `<Dropdown>`
- [ ] Pas de badges customisés → utiliser `<Badge>`

## 📍 Fichiers déjà migrés

✅ Fichiers utilisant les composants UI :
- `src/views/SettingsView.vue` - Select, Toggle, Button
- `src/components/game/GameOverlay.vue` - Button
- `src/views/LibraryFullscreen.vue` - Button
- `src/views/GameDetails.vue` - Button, Badge
- `src/views/GameDetailView.vue` - Button
- `src/views/LibraryGrid.vue` - Button

## 🚫 Anti-patterns à éviter

```vue
<!-- ❌ Ne PAS dupliquer les styles UI -->
<button class="px-5 py-3 bg-[#5e5ce6] rounded-xl shadow-glow hover:bg-[#7c7ae8]">
  ...
</button>

<!-- ❌ Ne PAS recréer un toggle/switch -->
<div @click="toggle" class="relative w-12 h-6 ...">
  <span :class="active ? 'translate-x-6' : 'translate-x-1'" />
</div>

<!-- ❌ Ne PAS créer des modals inline -->
<div v-if="show" class="fixed inset-0 bg-black/80 backdrop-blur-lg">
  <div class="bg-[#141419] rounded-2xl p-8">
    ...
  </div>
</div>

<!-- ✅ TOUJOURS utiliser les composants -->
<Button>...</Button>
<Toggle v-model="active" />
<Modal v-model="show">...</Modal>
```

## 🎯 Avantages

1. **Cohérence** - Design ReMiX uniforme partout
2. **Accessibilité** - Navigation clavier/manette intégrée
3. **Maintenabilité** - Un seul endroit à modifier
4. **TypeScript** - Props typées, autocomplete
5. **Performances** - Headless UI optimisé
6. **DX** - Moins de code à écrire

---

**Règle d'or** : Si un composant UI existe, utilisez-le. Si vous avez besoin d'un nouveau pattern, créez d'abord le composant UI réutilisable.
