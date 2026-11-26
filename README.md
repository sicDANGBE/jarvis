# Jarvis

Assistant IA de bureau pour les collaborateurs de l'agence, basé sur l'agent
[Pi](https://pi.dev). Une fenêtre de conversation simple, sans terminal, avec l'historique des
échanges, des paramètres accessibles et des capacités métier (documents, mail, diagrammes,
tâches planifiées).

## Installation (sans droits administrateur)

Sur un poste Linux x86_64, avec votre compte utilisateur (jamais avec `sudo`) :

```bash
curl -fsSL https://raw.githubusercontent.com/sicDANGBE/jarvis/main/scripts/install.sh | sh
```

Le script télécharge la dernière version (stable, sinon `nightly`), vérifie son empreinte, l'installe
dans `~/.local/share/jarvis`, et ajoute Jarvis au menu des applications avec son icône ainsi que la
commande `~/.local/bin/jarvis`. Relancez-le pour mettre à jour ; pour désinstaller :

```bash
curl -fsSL https://raw.githubusercontent.com/sicDANGBE/jarvis/main/scripts/install.sh | sh -s -- --uninstall
```

Il n'est pas nécessaire d'installer Pi : l'application embarque l'agent. L'AppImage reste aussi
téléchargeable directement depuis l'onglet **Releases**.

Sur Ubuntu ≥ 23.10, AppArmor restreint les user namespaces : l'application démarre alors sans
sandbox Chromium et l'indique dans le terminal. Pour la réactiver sur un parc, l'admin déploie une
fois le profil fourni (`resources/linux/apparmor-jarvis` dans l'AppImage) :

```bash
sudo install -m 644 apparmor-jarvis /etc/apparmor.d/jarvis
sudo apparmor_parser -r /etc/apparmor.d/jarvis
```

## Fonctionnalités

| Domaine                                                                                 | État        |
| --------------------------------------------------------------------------------------- | ----------- |
| Conversations en cours et passées, paramètres, fournisseurs de modèles                  | ✅          |
| Espaces de travail distants via SSH                                                     | ✅          |
| Tâches planifiées (application ouverte)                                                 | ✅          |
| Passerelle réseau : intranet par défaut, chaque accès réseau signalé                    | ✅          |
| Configuration et prompt système centralisés et signés                                   | 🧱 socle    |
| Coffre de secrets (trousseau système)                                                   | 🧱 socle    |
| Daemon utilisateur (tâches même application fermée), démarrage à l'ouverture de session | 🧱 socle    |
| Connexion OIDC, carte à puce (PKCS#11)                                                  | 📐 spécifié |
| Documents LibreOffice, mail, diagrammes, Jira, mémoire, plugins et savoirs              | 📐 spécifié |

La documentation complète (architecture, fonctionnalités, sécurité, exploitation, spécification,
glossaire) est dans [`docs/`](docs/README.md).

## Développement

```bash
pnpm install
pnpm dev              # lance l'application en développement
pnpm typecheck
pnpm exec playwright test -c apps/desktop/playwright.config.ts apps/desktop/tests/unit/jarvis-
```

Architecture et règles du dépôt : [`docs/architecture.md`](docs/architecture.md),
[`AGENTS.md`](AGENTS.md).

## Publication

- Lancement manuel du workflow **Jarvis AppImage** → pré-release `nightly`.
- Tag `vX.Y.Z` → release stable.

## Licence

MIT — voir [`LICENSE`](LICENSE).
