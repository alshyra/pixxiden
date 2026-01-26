# 🔄 Feature: Mises à Jour Système depuis PixiDen

## 📋 Contexte

Pour offrir une expérience "console" complète, PixiDen doit permettre à l'utilisateur de mettre à jour son système Linux directement depuis l'application, sans avoir à ouvrir un terminal ou quitter le mode "couch gaming".

**Principe** : L'utilisateur reste dans PixiDen pour gérer son système, comme sur une PlayStation ou Xbox.

---

## 🎯 Objectifs

1. **Vérifier les mises à jour** disponibles (kernel, drivers, packages système)
2. **Installer les mises à jour** directement depuis PixiDen
3. **Afficher la progression** en temps réel (téléchargement, installation)
4. **Support multi-distributions** (Arch/SteamOS, Ubuntu, Fedora, etc.)
5. **Navigation manette** complète pour toutes les opérations
6. **Sécurité** : Configuration sudoers avec consentement explicite de l'utilisateur

---

## 🔐 Stratégie d'Authentification

### Problème

Les commandes de mise à jour système (`pacman -Syu`, `apt upgrade`, etc.) nécessitent des privilèges administrateur (`sudo`), ce qui demande normalement un mot de passe.

**Contrainte UX** : Entrer un mot de passe avec une manette est difficile et casse l'expérience console.

---

### Solution : Configuration Sudoers avec Consentement

**Au premier lancement de PixiDen** (ou lors de l'accès initial aux mises à jour système) :

#### Étape 1 : Explication à l'utilisateur

Afficher un écran d'information clair :

```
┌──────────────────────────────────────────────────┐
│  CONFIGURATION DES MISES À JOUR SYSTÈME          │
├──────────────────────────────────────────────────┤
│                                                  │
│  Pour permettre les mises à jour système        │
│  directement depuis PixiDen, nous devons         │
│  configurer votre système.                       │
│                                                  │
│  🔒 Ce que nous allons faire :                   │
│                                                  │
│  • Créer une règle de sécurité pour PixiDen     │
│  • Autoriser UNIQUEMENT les mises à jour        │
│  • AUCUNE autre commande administrative         │
│                                                  │
│  📝 Fichier créé :                               │
│  /etc/sudoers.d/pixxiden                         │
│                                                  │
│  ⚠️ Vous devrez entrer votre mot de passe        │
│     UNE SEULE FOIS pour cette configuration.    │
│                                                  │
│  Ensuite, les mises à jour se feront sans       │
│  redemander de mot de passe.                     │
│                                                  │
│  [Continuer]  [Plus tard]                        │
└──────────────────────────────────────────────────┘
```

**Boutons** :
- **Continuer** : Procéder à la configuration
- **Plus tard** : Retour (les updates système seront désactivées jusqu'à configuration)

---

#### Étape 2 : Demande de Mot de Passe

Si l'utilisateur accepte, afficher un écran de saisie de mot de passe :

```
┌──────────────────────────────────────────────────┐
│  AUTHENTIFICATION REQUISE                        │
├──────────────────────────────────────────────────┤
│                                                  │
│  Entrez votre mot de passe administrateur :      │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ ••••••••••                                 │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  💡 Astuce : Utilisez un clavier USB ou         │
│     le clavier virtuel (appuyez sur Y)          │
│                                                  │
│  [Annuler]  [Valider]  [Clavier Virtuel]        │
└──────────────────────────────────────────────────┘
```

**Options** :
- Input avec clavier physique USB
- Clavier virtuel navigable à la manette
- Affichage masqué (•••)

---

#### Étape 3 : Configuration Automatique

Une fois le mot de passe validé, PixiDen :

1. **Crée le fichier** `/etc/sudoers.d/pixxiden` avec les permissions appropriées
2. **Configure les règles** limitées aux commandes de mise à jour uniquement
3. **Valide** la configuration (sudoers syntax check)
4. **Confirme** à l'utilisateur que c'est terminé

**Écran de confirmation** :

```
┌──────────────────────────────────────────────────┐
│  ✓ CONFIGURATION RÉUSSIE                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  Les mises à jour système sont maintenant        │
│  activées !                                      │
│                                                  │
│  Vous pouvez vérifier et installer les mises    │
│  à jour directement depuis PixiDen.              │
│                                                  │
│  [OK]                                            │
└──────────────────────────────────────────────────┘
```

---

### Règles Sudoers Créées

**Principe de moindre privilège** : Autoriser UNIQUEMENT les commandes de mise à jour, rien d'autre.

**Fichier** : `/etc/sudoers.d/pixxiden`

**Contenu** (adapté selon la distribution) :
- Arch/SteamOS : `pacman -Syu` avec variations
- Ubuntu/Debian : `apt update`, `apt upgrade`, `apt full-upgrade`
- Fedora : `dnf upgrade`
- openSUSE : `zypper update`

**Permissions** : 0440 (lecture seule, owned by root)

**Sécurité** :
- ✅ Limité aux commandes d'update seulement
- ✅ Pas d'accès shell root
- ✅ Pas d'autres commandes administratives
- ✅ Validé par `visudo` lors de la création (syntax check)

---

## 🎨 UI/UX - Settings → System Updates

### Vue Principale

```
┌──────────────────────────────────────────────────┐
│  MISES À JOUR SYSTÈME                            │
├──────────────────────────────────────────────────┤
│                                                  │
│  📊 Statut du système                            │
│  ✓ Système à jour                                │
│  Dernière vérification : Il y a 2h               │
│                                                  │
│  [🔍 Vérifier les mises à jour]                  │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  ⚙️ Options                                      │
│                                                  │
│  Vérification automatique                        │
│  [✓] Au démarrage                                │
│  [✓] Toutes les 24h                              │
│                                                  │
│  Notifications                                   │
│  [✓] M'alerter si mises à jour disponibles       │
│  [ ] Installer automatiquement (déconseillé)     │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### Écran "Mises à Jour Disponibles"

```
┌──────────────────────────────────────────────────┐
│  📦 12 MISES À JOUR DISPONIBLES                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Packages système (5)                            │
│  ▸ linux           6.6.1 → 6.6.2   [critique]    │
│  ▸ mesa            24.0 → 24.1     [graphiques]  │
│  ▸ systemd        255 → 256        [système]     │
│  ▸ pipewire       1.0.1 → 1.0.2    [audio]       │
│  ▸ steam          1.0.0.78 → ...   [gaming]      │
│                                                  │
│  Bibliothèques (4)                               │
│  ▸ glibc, openssl, libx11, wayland               │
│                                                  │
│  Applications (3)                                │
│  ▸ firefox, vlc, gimp                            │
│                                                  │
│  Taille totale : 450 MB                          │
│                                                  │
│  [Installer tout]  [Détails]  [Ignorer]          │
└──────────────────────────────────────────────────┘
```

**Navigation** :
- ⬆⬇ : Parcourir les packages
- A : Installer tout
- X : Voir détails d'un package
- B : Retour

---

### Écran de Progression

```
┌──────────────────────────────────────────────────┐
│  INSTALLATION EN COURS                           │
├──────────────────────────────────────────────────┤
│                                                  │
│  📥 Téléchargement des packages...               │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  52%                      │
│                                                  │
│  Package actuel :                                │
│  mesa-24.1.0-1 (125 MB)                          │
│                                                  │
│  Vitesse : 12.5 MB/s                             │
│  Temps restant estimé : 2 min 30s                │
│                                                  │
│  ⚠️ Ne pas éteindre le système                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Étapes affichées** :
1. Téléchargement des packages
2. Vérification de l'intégrité
3. Installation des packages
4. Configuration post-installation
5. Nettoyage

---

### Écran de Confirmation

```
┌──────────────────────────────────────────────────┐
│  ✓ MISES À JOUR INSTALLÉES                       │
├──────────────────────────────────────────────────┤
│                                                  │
│  12 packages mis à jour avec succès              │
│                                                  │
│  📋 Résumé :                                      │
│  • Kernel mis à jour (6.6.1 → 6.6.2)             │
│  • Drivers graphiques mis à jour                 │
│  • 10 autres packages                            │
│                                                  │
│  ⚠️ Redémarrage recommandé                       │
│     (nouveau kernel installé)                    │
│                                                  │
│  [Redémarrer maintenant]  [Plus tard]            │
└──────────────────────────────────────────────────┘
```

**Si redémarrage nécessaire** :
- Détecter si kernel/systemd/mesa mis à jour
- Proposer redémarrage immédiat ou plus tard
- Badge "⚠️ Redémarrage requis" dans footer

---

## 🔧 Backend Architecture

### Détection Distribution

**Au démarrage**, détecter quelle distribution Linux tourne :

**Sources** :
- `/etc/os-release` (standard)
- `/etc/lsb-release` (legacy)

**Distributions supportées** :
- **Arch Linux** (+ variantes : CachyOS, EndeavourOS, Manjaro)
- **SteamOS** (basé Arch)
- **Ubuntu** (+ dérivés : Pop!_OS, Linux Mint)
- **Debian**

**Priorité MVP** : Arch/CachyOS et Ubuntu/Debian uniquement.

---

### Gestion des Commandes par Distribution

**Chaque distribution utilise un package manager différent** :

| Distribution | Check Updates | Install Updates | Clean Cache |
|--------------|---------------|-----------------|-------------|
| **Arch/CachyOS/SteamOS** | `pacman -Qu` | `pacman -Syu --noconfirm` | `pacman -Sc --noconfirm` |
| **Ubuntu/Debian** | `apt list --upgradable` | `apt upgrade -y` | `apt autoremove -y` |

**Backend doit** :
- Détecter si Arch-based ou Debian-based
- Utiliser les bonnes commandes (pacman vs apt)
- Parser les sorties (format différent)
- Standardiser les résultats pour le frontend

**Détection** :
- Arch-based : Présence de `/usr/bin/pacman`
- Debian-based : Présence de `/usr/bin/apt`

---

### Spécificités CachyOS

**CachyOS** est une distribution basée sur Arch avec optimisations :
- ✅ Utilise `pacman` (même commandes qu'Arch)
- ✅ Peut avoir des miroirs personnalisés
- ✅ Supporte les packages AUR (via helper comme `yay` ou `paru`)

**Pour PixiDen** :
- Traiter CachyOS comme Arch standard
- Utiliser uniquement les repos officiels (pas AUR pour sécurité)
- Respecter les miroirs configurés par l'utilisateur

---

### Services Backend

#### 1. SystemUpdateService

**Responsabilités** :
- Détecter la distribution
- Vérifier les mises à jour disponibles
- Installer les mises à jour
- Parser les sorties des package managers
- Détecter si redémarrage nécessaire

**Méthodes** :
- `detect_distro() -> Distro`
- `check_updates() -> Vec<UpdatePackage>`
- `install_updates() -> Result<UpdateReport>`
- `requires_reboot() -> bool`

---

#### 2. SudoersConfigService

**Responsabilités** :
- Vérifier si sudoers est déjà configuré
- Créer le fichier `/etc/sudoers.d/pixxiden`
- Valider la syntaxe avec `visudo`
- Gérer les permissions du fichier

**Méthodes** :
- `is_configured() -> bool`
- `configure_sudoers(password: String) -> Result<()>`
- `validate_sudoers() -> Result<()>`

---

#### 3. UpdateProgressService

**Responsabilités** :
- Stream la sortie des commandes d'update en temps réel
- Parser les lignes de progression (téléchargement, installation)
- Émettre des événements Tauri pour le frontend
- Calculer pourcentage de progression

**Événements Tauri** :
- `update-downloading` : Package en cours de téléchargement
- `update-installing` : Package en cours d'installation
- `update-progress` : Progression globale (0-100%)
- `update-completed` : Mises à jour terminées
- `update-failed` : Erreur lors de l'update

---

### Tauri Commands

**Configuration** :
- `is_sudoers_configured() -> bool` : Check si config déjà faite
- `configure_sudoers(password: String) -> Result<()>` : Créer config sudoers

**Updates** :
- `check_system_updates() -> Result<Vec<UpdatePackage>>` : Liste des updates
- `install_system_updates() -> Result<UpdateReport>` : Lance l'installation
- `requires_system_reboot() -> bool` : Check si redémarrage requis

**System** :
- `reboot_system() -> Result<()>` : Redémarre le système

---

### Types de Données

#### UpdatePackage

**Représente un package à mettre à jour** :

**Champs** :
- `name`: String (nom du package)
- `current_version`: String (version actuelle)
- `new_version`: String (nouvelle version)
- `category`: PackageCategory (système, graphiques, audio, app)
- `size`: u64 (taille en bytes)
- `critical`: bool (mise à jour critique, ex: kernel)

#### PackageCategory

**Catégories de packages** :
- System (kernel, systemd, glibc)
- Graphics (mesa, nvidia, amd drivers)
- Audio (pipewire, pulseaudio)
- Gaming (steam, proton, wine)
- Applications (firefox, etc.)
- Libraries (autres libs)

#### UpdateReport

**Résultat de l'installation** :

**Champs** :
- `total_packages`: u32
- `installed_successfully`: u32
- `failed`: Vec<String> (liste des packages en échec)
- `requires_reboot`: bool
- `duration`: Duration (temps total)

---

## 🎮 Navigation Manette

### Settings → System → Updates

**Contrôles** :
- D-pad ⬆⬇ : Naviguer dans la liste des packages
- A : Sélectionner / Valider
- B : Retour
- X : Afficher détails d'un package
- Y : Ouvrir clavier virtuel (pour mot de passe)

**États du bouton principal** :
- "Vérifier les mises à jour" (état initial)
- "Installer X mises à jour" (si updates disponibles)
- "Installation en cours..." (disabled pendant update)
- "Redémarrer" (si redémarrage requis)

---

## 🔔 Notifications

### Mises à Jour Disponibles

**Si vérification automatique activée** :

```
┌─────────────────────────────────────┐
│  📦 Mises à jour disponibles        │
│                                     │
│  12 packages peuvent être mis à     │
│  jour, incluant le kernel et les    │
│  drivers graphiques.                │
│                                     │
│  [Installer]  [Plus tard]           │
└─────────────────────────────────────┘
```

**Badge dans le footer** :
```
[Settings] (•12)  ← Indicateur de 12 updates
```

---

### Redémarrage Requis

**Badge persistant après update** :

```
Footer: [⚠️ Redémarrage requis]
```

**Reminder au shutdown** :
```
┌─────────────────────────────────────┐
│  ⚠️ Redémarrage recommandé          │
│                                     │
│  Le système a été mis à jour.       │
│  Un redémarrage est recommandé      │
│  pour appliquer tous les            │
│  changements.                       │
│                                     │
│  [Redémarrer]  [Éteindre]  [Annuler]│
└─────────────────────────────────────┘
```

---

## 🛡️ Sécurité & Bonnes Pratiques

### Principe de Moindre Privilège

**Ce qui est autorisé** :
- ✅ Vérifier les updates (commandes read-only)
- ✅ Installer les updates (commandes d'upgrade uniquement)
- ✅ Nettoyer le cache (commandes de clean)

**Ce qui n'est PAS autorisé** :
- ❌ Installation de nouveaux packages
- ❌ Suppression de packages
- ❌ Modification de la configuration système
- ❌ Accès shell root
- ❌ Toute autre commande administrative

---

### Validation & Logging

**Avant installation** :
- Vérifier signatures des packages (automatique avec pacman/apt)
- Afficher résumé des changements
- Demander confirmation explicite

**Pendant installation** :
- Logger toutes les opérations dans `~/.local/share/pixxiden/logs/updates.log`
- Garder historique des 10 dernières updates
- Timestamp + liste des packages installés

**Après installation** :
- Vérifier si installation réussie
- Détecter si redémarrage nécessaire
- Proposer rollback si échec (si possible avec la distro)

---

### Gestion des Erreurs

**Cas d'erreur possibles** :
- Mot de passe incorrect lors de la configuration
- Échec de téléchargement (réseau coupé)
- Conflit de dépendances
- Espace disque insuffisant
- Corruption de package

**Pour chaque erreur** :
- Afficher message clair en français
- Proposer solution (ex: "Libérer de l'espace disque")
- Logger l'erreur complète
- Permettre retry ou annulation

---

## 🎯 User Stories

### Story 1 : Première Configuration

```
EN TANT QU'utilisateur qui lance PixiDen pour la première fois
QUAND j'accède à Settings → System → Updates
ALORS je vois un écran m'expliquant la configuration sudoers
ET je peux choisir de configurer maintenant ou plus tard
ET si je choisis de configurer, j'entre mon mot de passe une seule fois
ET ensuite les updates fonctionnent sans redemander le mot de passe
```

---

### Story 2 : Vérification Manuelle

```
EN TANT QU'utilisateur avec sudoers configuré
QUAND je vais dans Settings → System → Updates
ET que je clique sur "Vérifier les mises à jour"
ALORS le système scan les updates disponibles
ET affiche la liste avec catégories (système, graphiques, etc.)
ET je peux choisir d'installer tout ou ignorer
```

---

### Story 3 : Installation avec Progression

```
EN TANT QU'utilisateur qui lance l'installation
QUAND je clique sur "Installer les mises à jour"
ALORS un écran de progression s'affiche
ET je vois en temps réel :
  - Le package en cours de téléchargement
  - La vitesse de téléchargement
  - Le pourcentage global
  - Le temps estimé
ET à la fin, je reçois une confirmation
ET si redémarrage nécessaire, on me le propose
```

---

### Story 4 : Vérification Automatique

```
EN TANT QU'utilisateur avec vérification auto activée
QUAND je lance PixiDen
ET qu'il y a plus de 24h depuis la dernière vérification
ALORS le système vérifie automatiquement en arrière-plan
ET si des updates sont disponibles, une notification s'affiche
ET un badge apparaît dans le footer
ET je peux cliquer pour installer ou ignorer
```

---

## ✅ Checklist d'Implémentation

### Phase 1 : Configuration Sudoers
- [ ] Créer UI d'explication de la configuration
- [ ] Implémenter input mot de passe (clavier physique + virtuel)
- [ ] Créer service `SudoersConfigService`
- [ ] Tester création fichier `/etc/sudoers.d/pixxiden`
- [ ] Valider avec `visudo`
- [ ] Gérer erreurs (password incorrect, permissions, etc.)

### Phase 2 : Détection & Vérification
- [ ] Implémenter détection distribution
- [ ] Créer `SystemUpdateService`
- [ ] Implémenter `check_updates()` pour chaque distro
- [ ] Parser les sorties des package managers
- [ ] Afficher liste des updates dans l'UI
- [ ] Catégoriser les packages (système, graphiques, etc.)

### Phase 3 : Installation
- [ ] Implémenter `install_updates()`
- [ ] Stream la progression en temps réel (événements Tauri)
- [ ] Afficher UI de progression
- [ ] Gérer les erreurs d'installation
- [ ] Détecter si redémarrage nécessaire
- [ ] Logger toutes les opérations

### Phase 4 : Navigation Manette
- [ ] Adapter navigation dans Settings → System → Updates
- [ ] Permettre scroll dans la liste de packages
- [ ] Implémenter clavier virtuel pour mot de passe
- [ ] Tester flow complet à la manette

### Phase 5 : Automatisation & Notifications
- [ ] Implémenter vérification automatique au démarrage
- [ ] Implémenter vérification toutes les 24h
- [ ] Créer système de notifications
- [ ] Badge dans footer avec count
- [ ] Proposition redémarrage au shutdown

### Phase 6 : Polish & Sécurité
- [ ] Logger toutes les updates
- [ ] Historique des 10 dernières updates
- [ ] Gestion fine des erreurs avec messages clairs
- [ ] Tests sur Arch Linux + CachyOS
- [ ] Tests sur Ubuntu + Debian
- [ ] Vérifier compatibilité SteamOS (Arch-based)
- [ ] Documentation utilisateur

---

## 💡 Notes Techniques

- **Mot de passe** : Demandé UNE SEULE FOIS lors de la config, jamais stocké
- **Sudoers** : Fichier créé avec permissions 0440, validé avec `visudo`
- **Streaming** : Utiliser événements Tauri pour progression temps réel
- **Redémarrage** : Détecter via packages installés (kernel, systemd, mesa)
- **Multi-distro** : Abstraire les commandes derrière un trait/interface
- **Rollback** : Dépend de la distro (possible avec Btrfs snapshots sur Arch/CachyOS)
- **Cache** : Proposer nettoyage du cache package manager (libérer espace)
- **CachyOS** : Compatible à 100% avec Arch, mêmes commandes pacman
- **Détection** : Vérifier `/usr/bin/pacman` (Arch-based) ou `/usr/bin/apt` (Debian-based)

---

## 🚀 Extensions Futures (Hors Scope MVP)

**Arch/CachyOS** :
- Support AUR updates (via yay/paru)
- Snapshots BTRFS avant update (rollback automatique)
- Kernel downgrade tools integration
- CachyOS-specific optimizations

**Ubuntu/Debian** :
- Support PPAs updates
- Timeshift integration (snapshots)
- Ubuntu Pro updates support

**Général** :
- Logs détaillés consultables depuis l'UI
- Filtrage des updates (installer seulement certains packages)
- Scheduling des updates (installer à une heure précise)
- Support Flatpak/Snap updates
- Support Steam client updates

---

## 📚 Resources

**Arch Linux / CachyOS** :
- [Arch Wiki - Sudo](https://wiki.archlinux.org/title/Sudo)
- [Arch Wiki - System Maintenance](https://wiki.archlinux.org/title/System_maintenance)
- [Arch Wiki - Pacman](https://wiki.archlinux.org/title/Pacman)
- [CachyOS Documentation](https://wiki.cachyos.org/)

**Ubuntu / Debian** :
- [Ubuntu - Package Management](https://help.ubuntu.com/community/AptGet/Howto)
- [Debian - APT Documentation](https://www.debian.org/doc/manuals/apt-guide/)
- [Ubuntu - System Updates](https://help.ubuntu.com/community/AptGet/Howto#Updating_the_package_lists)

**Général** :
- [PolicyKit Documentation](https://www.freedesktop.org/software/polkit/docs/latest/)
- [Sudoers Manual](https://www.sudo.ws/docs/man/sudoers.man/)
