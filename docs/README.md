# Store Authentication

## Installation

```bash
npm install  # postinstall télécharge les CLIs automatiquement
```

## Usage

1. **Settings → Stores**
2. Cliquer "Se connecter" sur un store
3. Suivre le flow d'authentification

## Stores Supportés

| Store        | Type                 | CLI       |
| ------------ | -------------------- | --------- |
| Epic Games   | OAuth navigateur     | legendary |
| GOG          | Code à copier/coller | gogdl     |
| Amazon Games | Email/password + 2FA | nile      |
| Steam        | Détection auto       | -         |

## Gamepad

- **D-pad / Stick gauche** : Navigation
- **A / X** : Sélectionner/Connecter
- **B / ○** : Retour

## Troubleshooting

**CLI manquant** : `npm run setup:sidecars`  
**Navigateur ne s'ouvre pas** : Vérifier le navigateur par défaut  
**2FA échoue** : Vérifier l'heure système (codes sensibles au temps)

## Composants

- `StoresSettings.vue` - Page principale
- `StoreCard.vue` - Carte par store
- `*AuthModal.vue` - Modaux d'authentification
- `auth.ts` - Pinia store
- `useFocusNavigation.ts` - Navigation gamepad

## Sécurité

✅ Credentials jamais stockés par Pixxiden  
✅ Gérés par les CLIs (chiffrés)  
✅ Local uniquement, pas de serveur Pixxiden
