# Composant PixxidenLogo

Logo animé Pixxiden avec hexagone et effet de lueur.

## Utilisation

```vue
<script setup>
import { PixxidenLogo } from '@/components/ui'
</script>

<template>
  <!-- Logo par défaut (100px avec glow) -->
  <PixxidenLogo />
  
  <!-- Logo personnalisé -->
  <PixxidenLogo :size="80" :glow="false" />
  
  <!-- Logo avec taille en string -->
  <PixxidenLogo size="5rem" :glow="true" />
</template>
```

## Props

| Prop   | Type              | Défaut | Description                              |
|--------|-------------------|--------|------------------------------------------|
| `size` | `number \| string` | `100`  | Taille du logo (en px si number)         |
| `glow` | `boolean`         | `true` | Active/désactive l'effet de lueur arrière |

## Caractéristiques

- **Animation** : L'hexagone a une animation de tracé en boucle (4s)
- **Hover effect** : Scale de 1.05 au survol
- **Gradient** : Dégradé bleu → violet sur l'hexagone
- **Glow** : Halo lumineux indigo en arrière-plan (optionnel)
- **Drop shadow** : Ombre portée avec lueur indigo

## Où est-il utilisé ?

- `GameCard.vue` : Placeholder quand aucune image de jeu n'est disponible
- `SettingsView.vue` : Logo dans la sidebar (40px)
- `LibraryFullscreen.vue` : Empty state quand aucun jeu (96px)

## Style

Le logo respecte le design system ReMiX avec :
- Palette indigo néon (#5e5ce6)
- Animations smooth avec cubic-bezier(0.2, 0.8, 0.2, 1)
- Typographie monospace pour "PX"
