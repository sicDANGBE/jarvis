# Documentation de Jarvis

Jarvis est l'assistant IA de bureau des collaborateurs de l'agence, techniciens ou non. C'est une
application Electron construite sur l'agent Pi (paquet npm `@earendil-works/pi-coding-agent`),
organisée en monorepo pnpm et distribuée sous forme d'AppImage Linux installable sans `sudo`.

Cette documentation décrit **l'état réel du code**. Chaque fonctionnalité y porte l'un de ces trois
états :

| État                     | Signification                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| ✅ **Opérationnel**      | Branché dans l'application et utilisable aujourd'hui.                                         |
| 🧱 **Socle non branché** | Le code existe et il est testé, mais aucun écran ni aucun flux de l'application ne l'appelle. |
| 📐 **Spécifié**          | Décrit dans la [spécification](specification.md), sans code correspondant dans le dépôt.      |

## Sommaire

| Document                              | Contenu                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Architecture](architecture.md)       | Processus main, preload et renderer, owners, IPC, persistance, pilote Pi, extensions.            |
| [Fonctionnalités](fonctionnalites.md) | Ce qui existe aujourd'hui, écran par écran, avec l'état de chaque fonctionnalité.                |
| [Sécurité](securite.md)               | Configuration signée, sorties réseau, coffre de secrets, sandbox, daemon, OIDC/PKCS#11, limites. |
| [Exploitation](exploitation.md)       | Installation, profil AppArmor, clé Ed25519 et signature, workflow de release, variables.         |
| [Spécification](specification.md)     | La cible fonctionnelle de Jarvis (document de référence produit).                                |
| [Glossaire](glossaire.md)             | Les termes employés dans le code et la documentation.                                            |

## Documents techniques hérités (en anglais)

Ces documents viennent de la base de code d'origine. Ils restent valables pour le détail technique
mais ne parlent pas des ajouts propres à Jarvis.

| Document                                                                                                                           | Contenu                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [architecture-ownership.en.md](architecture-ownership.en.md)                                                                       | Référence détaillée des owners, de la persistance, de la revue et des captures. |
| [ci-baseline.md](ci-baseline.md)                                                                                                   | Commandes de vérification du dépôt.                                             |
| [chord-desktop-extension-design.md](chord-desktop-extension-design.md)                                                             | Conception des vues d'extension (Chord).                                        |
| [ssh-workspaces.md](ssh-workspaces.md)                                                                                             | Espaces de travail distants via SSH.                                            |
| [thinking-support.md](thinking-support.md)                                                                                         | Niveaux de raisonnement des modèles.                                            |
| [provider-and-subagent-fixes.md](provider-and-subagent-fixes.md)                                                                   | Correctifs fournisseurs et sous-agents.                                         |
| [merge-enforcement.md](merge-enforcement.md)                                                                                       | Règles de fusion.                                                               |
| [workspace-redesign-plan.md](workspace-redesign-plan.md), [workspace-redesign-verification.md](workspace-redesign-verification.md) | Historique de la refonte de l'espace de travail.                                |

Les règles de travail dans le dépôt (pour les humains comme pour les agents) sont dans
[`AGENTS.md`](../AGENTS.md) ; `CLAUDE.md` en est un lien symbolique.
