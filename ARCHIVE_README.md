# Pixxiden - Archive Release

## 📦 Contents

Cette archive contient le code source complet de **Pixxiden**, votre launcher de jeux multi-magasins pour Linux.

## 🚀 Pour Commencer

### 1. Extraire l'archive

```bash
tar -xzf Pixxiden.tar.gz
cd Pixxiden
```

### 2. Lire la documentation

- **README.md** - Vue d'ensemble du projet
- **QUICKSTART.md** - Guide de démarrage rapide
- **docs/architecture.md** - Architecture détaillée

### 3. Installation rapide

```bash
./setup.sh
```

### 4. Lancer en développement

**Terminal 1 (Backend):**
```bash
make dev-backend
```

**Terminal 2 (Frontend):**
```bash
make dev-frontend
```

## 📁 Structure du Projet

```
Pixxiden/
├── backend/                 # Backend Go
│   ├── cmd/daemon/         # Point d'entrée principal
│   ├── internal/           # Code interne
│   │   ├── api/           # Serveur HTTP/REST
│   │   ├── db/            # Base de données SQLite
│   │   ├── library/       # Service bibliothèque
│   │   ├── runner/        # Gestion Wine/Proton
│   │   └── store/         # Adapters (Legendary, GOGdl, Nile)
│   └── go.mod
│
├── frontend/               # Frontend Tauri + Vue.js
│   ├── src/
│   │   ├── components/    # Composants Vue
│   │   ├── views/         # Vues principales
│   │   ├── stores/        # State management (Pinia)
│   │   └── services/      # Services API
│   ├── package.json
│   └── tailwind.config.js # Config ReMiX theme
│
├── docs/                   # Documentation
├── .github/workflows/      # CI/CD
├── Makefile               # Commandes build
├── setup.sh               # Script d'installation
└── README.md

```

## 🎮 Fonctionnalités Implémentées

✅ **Backend Go complet**
- Serveur HTTP/REST API (port 9876)
- Base de données SQLite avec GORM
- Adapter Legendary pour Epic Games
- Service de gestion de bibliothèque
- Service de gestion des runners (Wine/Proton)
- Tests unitaires structurés

✅ **Frontend Vue.js avec Tauri**
- Vue Grid complète avec filtres et recherche
- Composant GameCard avec style ReMiX
- State management avec Pinia
- API service pour communication backend
- Thème ReMiX (dark, moderne)
- TypeScript pour type safety

✅ **Infrastructure**
- Makefile pour faciliter le build
- Script d'installation automatique
- GitHub Actions pour CI/CD
- Configuration YAML
- Documentation complète

✅ **Session Mode**
- Fichier .desktop pour session Wayland
- Script de session avec Gamescope

## 🛠️ Prochaines Étapes (TODOs)

### Court terme
- [ ] Implémenter adapter GOGdl
- [ ] Implémenter adapter Nile
- [ ] Download manager complet
- [ ] Intégration complète Wine/Proton
- [ ] Vue détails du jeu
- [ ] Page Settings

### Moyen terme
- [ ] Support controller complet
- [ ] Mode Big Picture
- [ ] Tracking temps de jeu
- [ ] Metadata IGDB/SteamGridDB

### Long terme
- [ ] Cloud saves sync
- [ ] Achievement tracking
- [ ] Support Steam
- [ ] Mode Session production-ready

## 🎨 Design - Thème ReMiX

Le frontend utilise le thème ReMiX avec :
- Palette de couleurs dark (#0A0A0B, #1A1A1D, #6366F1)
- Cards avec hover effects
- Typography moderne (Inter + Poppins)
- Animations smooth
- Optimisé pour controller

## 📝 Notes Importantes

### Dépendances Externes

**CLI Tools requis:**
```bash
# Legendary (Epic Games)
pip install legendary-gl

# GOGdl (GOG)
# Voir: https://github.com/Heroic-Games-Launcher/heroic-gogdl

# Nile (Amazon)
# Voir: https://github.com/imLinguin/nile
```

### Configuration

Fichier de config : `~/.config/Pixxiden/config.yaml`

Voir `config.example.yaml` pour un exemple.

### Base de Données

SQLite database : `~/.config/Pixxiden/Pixxiden.db`

Créée automatiquement au premier lancement.

## 🤝 Pour Contribuer

1. Fork le projet sur GitHub
2. Créer une branche feature
3. Commit vos changements
4. Push et ouvrir une Pull Request

Voir **CONTRIBUTING.md** pour plus de détails.

## 📄 Licence

MIT License - Voir fichier LICENSE

## 🙏 Remerciements

- Heroic Games Launcher (CLI tools)
- Legendary (Epic Games)
- ReMiX Theme (design inspiration)

---

**Questions ?** Ouvrir une issue sur GitHub !

**Happy Gaming!** 🎮✨
