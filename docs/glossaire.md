# Glossaire

Termes employés dans le code, l'interface (en anglais) et la documentation de Jarvis.

| Terme                                              | Définition                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Pi**, **Pi**                               | L'agent de code sur lequel Jarvis est construit (paquets `@earendil-works/pi-*`). Il exécute les modèles et les outils, et possède l'historique des sessions. |
| **AppArmor**                                       | Module de sécurité du noyau Linux. Sur Ubuntu ≥ 23.10, il restreint les user namespaces, ce qui empêche la sandbox Chromium sans profil dédié.                |
| **AppImage**                                       | Format d'application Linux en un seul fichier exécutable, monté à la volée dans `/tmp/.mount_*`, sans installation ni droits root.                            |
| **Atelier** (« workbench »)                        | Le panneau latéral d'une tâche : fichiers, terminal, revue des modifications, vues d'extension.                                                               |
| **Bail de session** (« session lease »)            | Verrou posé par Jarvis sur un fil pour qu'un seul processus l'ouvre à la fois.                                                                                |
| **Bundle de configuration**                        | Document JSON signé publié par l'agence : prompt système, politique de sorties réseau, modèles, paquets, savoirs. Socle non branché.                          |
| **Capture de tour** (« turn checkpoint »)          | Instantané des fichiers d'un dossier avant et après un tour de l'agent, stocké dans un dépôt Git propre à Jarvis.                                             |
| **Carte** (« card »), **carte épinglée** (« pin ») | Bloc affiché dans la conversation, ou au-dessus du compositeur, par une extension (`jarvis.card`, `jarvis.pin`).                                              |
| **Catalogue**                                      | Registre des espaces de travail, sessions et worktrees connus de Jarvis (`catalogs.json`).                                                                    |
| **Chord**                                          | Bibliothèque de transport (`@earendil-works/chord`) utilisée entre une vue d'extension et son backend.                                                        |
| **Compétence** (« skill »)                         | Ensemble d'instructions et de fichiers que Pi charge à la demande ; peut fournir une commande `/`.                                                            |
| **Compositeur** (« composer »)                     | La zone de saisie d'un message, avec pièces jointes, commandes `/`, modèle et niveau de raisonnement.                                                         |
| **Coffre de secrets** (« vault »)                  | Stockage chiffré local des secrets, utilisé par références `{{secret:nom}}`. Socle non branché.                                                               |
| **contextIsolation**, **sandbox**                  | Options Electron qui isolent le code de la page de celui du preload, et qui placent le renderer dans la sandbox Chromium.                                     |
| **Daemon utilisateur**                             | Exécution des tâches planifiées hors de l'application, par un timer `systemd --user`. Socle non branché.                                                      |
| **Ed25519**                                        | Algorithme de signature à clé publique utilisé pour signer le bundle de configuration.                                                                        |
| **Egress**, **sorties réseau**                     | Connexions sortantes. Le garde d'egress n'autorise que les hôtes d'une liste. Socle non branché.                                                              |
| **Espace de travail** (« workspace »), **dossier** | Dossier local ou distant (SSH) ouvert dans Jarvis ; les fils y sont rattachés.                                                                                |
| **Extension Pi**                                   | Module chargé par Pi qui ajoute des outils, des commandes, des réglages, des cartes ou des vues.                                                              |
| **Extension intégrée**                             | Extension fournie par Jarvis lui-même : orchestration des fils, tâches planifiées.                                                                            |
| **Fil** (« thread »), **session**                  | Une conversation. Côté Pi, c'est une session enregistrée dans un fichier JSONL.                                                                               |
| **Fil enfant** (« child thread »)                  | Fil créé par l'agent pour déléguer un travail, suivi par l'orchestration.                                                                                     |
| **Fork**                                           | Bifurcation d'une conversation à partir d'un message : un nouveau fil reprend l'historique jusqu'à ce point.                                                  |
| **Hôte distant** (« remote host »)                 | Petit programme installé par Jarvis sur une machine SSH (`~/.local/share/jarvis-host`), qui y exécute les sessions Pi.                                        |
| **IPC**                                            | Communication entre le renderer et le process main, par des canaux nommés `jarvis:*`.                                                                         |
| **Lanceur** (« launcher »)                         | Script `jarvis` placé dans l'AppImage devant le binaire `jarvis.bin`, qui choisit le mode sandbox.                                                            |
| **Main**, **preload**, **renderer**                | Les trois parties d'une application Electron : le process Node, le pont exposé à la page, et la page elle-même.                                               |
| **MCP**                                            | Model Context Protocol : protocole qui donne à l'agent des outils fournis par des serveurs externes, configurés dans `mcp.json`.                              |
| **Nightly**                                        | Pré-release automatique, recréée à chaque lancement manuel du workflow AppImage.                                                                              |
| **OIDC**                                           | OpenID Connect : authentification déléguée à un fournisseur d'identité. Spécifié.                                                                             |
| **Orchestration**                                  | Owner qui gère les fils enfants et expose à l'agent les outils de fils.                                                                                       |
| **Owner**                                          | Composant qui possède un comportement et l'état mutable associé ; les autres passent par son interface.                                                       |
| **PKCS#11**                                        | Interface standard d'accès aux cartes à puce et jetons matériels. Spécifié.                                                                                   |
| **Portée de revue** (« review scope »)             | Ce que compare la revue : non commité, indexé, non indexé, branche, dernier tour.                                                                             |
| **Prompt système**                                 | Instructions données à l'agent avant toute conversation. Celui de l'agence est prévu dans le bundle de configuration.                                         |
| **Fournisseur** (« provider »)                     | Service qui héberge des modèles (Anthropic, OpenAI, Mistral, serveur local…), connecté par OAuth ou clé d'API.                                                |
| **`safeStorage`**                                  | API Electron de chiffrement adossée au trousseau du système (GNOME Keyring, KWallet).                                                                         |
| **Socle non branché**                              | Code présent et testé, mais qu'aucun écran ni flux de l'application n'appelle.                                                                                |
| **Tâche planifiée** (« scheduled task »)           | Message envoyé automatiquement à l'agent selon un planning (une fois, quotidien, hebdomadaire, intervalle).                                                   |
| **Tour** (« turn »)                                | Un échange : le message de l'utilisateur et tout le travail de l'agent jusqu'à sa réponse.                                                                    |
| **`userData`**                                     | Dossier de données de l'application, `~/.config/Jarvis` sous Linux.                                                                                           |
| **Vue d'extension** (« extension view »)           | Panneau de l'atelier fourni par une extension, isolé dans une iframe sans réseau.                                                                             |
| **Worktree**                                       | Copie de travail Git supplémentaire d'un même dépôt ; Jarvis en crée pour isoler le travail d'un fil.                                                         |
| **XDG autostart**                                  | Mécanisme standard des bureaux Linux pour lancer un programme à l'ouverture de session (`~/.config/autostart`).                                               |
