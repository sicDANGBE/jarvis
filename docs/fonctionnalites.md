# Fonctionnalités

Inventaire de ce qui existe dans le code aujourd'hui, écran par écran. Légende :

- ✅ **Opérationnel** : branché et utilisable dans l'application ;
- 🧱 **Socle non branché** : code présent et testé, mais aucun écran ni flux ne l'appelle ;
- 📐 **Spécifié** : décrit dans la [spécification](specification.md), sans code.

> **Langue de l'interface.** Les catalogues de traduction
> ([`src/i18n/messages`](../apps/desktop/src/i18n/messages)) n'existent qu'en anglais (`en`) et en
> chinois simplifié (`zh-CN`). L'interface de Jarvis s'affiche donc en anglais pour un poste
> français. Seuls les messages des ajouts Jarvis (module `electron/jarvis/`, lanceur Linux) sont en
> français. Les libellés anglais cités ci-dessous sont ceux de l'écran.

## Structure générale de la fenêtre

| Zone                                                       | Contenu                                                                                               | État |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---- |
| Barre latérale                                             | Dossiers (« workspaces »), fils de conversation, accès aux tâches, compétences, extensions, réglages. | ✅   |
| Centre                                                     | Fil de conversation ou écran secondaire (nouveau fil, tâches, réglages…).                             | ✅   |
| Panneau latéral (« side panel »)                           | Atelier : fichiers, terminal, revue des modifications, vues d'extension.                              | ✅   |
| Palette de commandes                                       | Recherche floue des actions et des fils.                                                              | ✅   |
| Icône persistante dans la barre système, briefing du matin | —                                                                                                     | 📐   |

Les vues principales sont définies dans
[`contracts/desktop-state.ts`](../apps/desktop/contracts/desktop-state.ts) : `threads`,
`new-thread`, `scheduled`, `skills`, `extensions`, `settings`.

## Barre latérale et fils de conversation

Code : [`src/features/threads`](../apps/desktop/src/features/threads).

| Fonctionnalité                                                                                                                                  | État |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Ouvrir un dossier local comme espace de travail ; retirer un dossier (sans supprimer ses fichiers)                                              | ✅   |
| Fils groupés par dossier, fils épinglés et récents, tri par activité                                                                            | ✅   |
| Actions sur un fil : renommer, épingler, archiver ou restaurer, marquer comme lu, ajouter une tâche planifiée, copier l'identifiant de session  | ✅   |
| Ouvrir le dossier du fil dans un éditeur détecté ou dans le gestionnaire de fichiers                                                            | ✅   |
| Changement rapide de fil (sélecteur et raccourcis)                                                                                              | ✅   |
| Découverte des sessions Pi existantes du dossier (créées par Pi en terminal)                                                                    | ✅   |
| Worktrees Git : créer un fil dans un worktree isolé (« Worktree », « Fork environment »)                                                        | ✅   |
| Espaces de travail distants via SSH (alias de `~/.ssh/config`, dossier Linux absolu)                                                            | ✅   |
| Personnalisation de la barre latérale (regroupement)                                                                                            | ✅   |
| Bloc utilisateur en bas de la barre latérale : prénom, rôle ou forfait, accès aux réglages (utilisateur simulé administrateur en développement) | ✅   |

Pour SSH, l'authentification passe par OpenSSH en mode `BatchMode` (clés déjà configurées) ; Node
et Pi doivent être installés sur la machine distante, où Jarvis installe un petit hôte
(`~/.local/share/jarvis-host`). Détails : [ssh-workspaces.md](ssh-workspaces.md).

## Nouveau fil

Code : [`new-thread-view.tsx`](../apps/desktop/src/features/threads/new-thread-view.tsx).

| Fonctionnalité                                                                    | État |
| --------------------------------------------------------------------------------- | ---- |
| Choix du dossier, du modèle, du niveau de raisonnement et des options d'extension | ✅   |
| Titre du fil généré automatiquement après le premier échange                      | ✅   |
| Indication d'aide quand aucun fournisseur de modèle n'est connecté                | ✅   |

## Conversation

Code : [`src/features/conversation`](../apps/desktop/src/features/conversation).

| Fonctionnalité                                                                                     | État |
| -------------------------------------------------------------------------------------------------- | ---- |
| Envoi de messages, réponse en flux, rendu Markdown (GFM), coloration syntaxique                    | ✅   |
| Bouton « Copier » sur chaque bloc de code                                                          | ✅   |
| `Entrée` envoie ; `Maj+Entrée` et l'`Entrée` du pavé numérique ajoutent une ligne                  | ✅   |
| Consignes de Jarvis ajoutées au prompt système : réponses en français par défaut                   | ✅   |
| Bouton « Stop » qui interrompt l'exécution en cours                                                | ✅   |
| File de messages : écrire pendant que l'agent travaille, modifier ou retirer un message en attente | ✅   |
| Pièces jointes (fichiers, images collées ou glissées), aperçu des images                           | ✅   |
| Commandes `/` : commandes de Pi, des extensions et des compétences (activables dans les réglages)  | ✅   |
| Mentions de fichiers du dossier dans le compositeur                                                | ✅   |
| Sélecteur de modèle et de niveau de raisonnement par fil                                           | ✅   |
| Jauge de contexte et d'usage (tokens en entrée et sortie, cache, coût, expiration du cache)        | ✅   |
| Affichage des appels d'outils, de leurs sorties et des images produites                            | ✅   |
| Recherche dans le fil                                                                              | ✅   |
| Bifurquer (« fork ») la conversation à partir d'un message                                         | ✅   |
| Naviguer dans l'arbre de la session (branches de l'historique Pi), avec résumé personnalisable     | ✅   |
| Carte « fichiers modifiés pendant ce tour », avec accès à la revue                                 | ✅   |
| Cartes et cartes épinglées ajoutées par une extension (`jarvis.card`, `jarvis.pin`)                | ✅   |
| Brouillons conservés par fil, y compris à la fermeture de la fenêtre                               | ✅   |
| Commandes Pi réservées au terminal : refusées avec un message explicite                            | ✅   |

### Outils que l'agent reçoit de Jarvis

| Extension intégrée   | Outils                                                                                                  | État |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ---- |
| Thread orchestration | `create_child_thread`, `list_threads`, `read_thread`, `send_message_to_thread`, `archive_child_threads` | ✅   |
| Scheduled tasks      | `create_scheduled_task`, `list_scheduled_tasks`, `update_scheduled_task`                                | ✅   |

Les deux extensions se désactivent pour toute l'application dans **Skills and extensions**.

## Panneau latéral (atelier)

Code : [`src/features/workbench`](../apps/desktop/src/features/workbench).

| Outil              | Fonctionnalité                                                                                                        | État |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ---- |
| Fichiers           | Explorateur du dossier, ouverture et édition de fichiers, copie de chemin                                             | ✅   |
| Terminal           | Terminal intégré (node-pty, xterm), plusieurs sessions, redémarrage ; shell configurable                              | ✅   |
| Revue (« Review ») | Portées : non commité, indexé, non indexé, branche (depuis la base de fusion), dernier tour ; diff, arbre filtrable   | ✅   |
| Revue              | Indexer et désindexer un fichier (« Stage », « Unstage »), marquer un fichier comme relu                              | ✅   |
| Captures de tour   | Arbres avant/après chaque tour de l'agent, dans un dépôt Git propre à Jarvis (sans toucher au dépôt de l'utilisateur) | ✅   |
| Vues d'extension   | Panneaux fournis par une extension Pi, isolés dans une iframe sans réseau                                             | ✅   |
| Disposition        | Onglets, largeur réglable, disposition mémorisée par tâche                                                            | ✅   |

Les limites de la revue et des captures (nombre de fichiers, tailles, délais) sont détaillées dans
[architecture-ownership.en.md](architecture-ownership.en.md#review-and-captured-turns).

## Tâches planifiées

Code : [`src/features/scheduled-tasks`](../apps/desktop/src/features/scheduled-tasks),
[`electron/scheduled-tasks`](../apps/desktop/electron/scheduled-tasks).

| Fonctionnalité                                                                                                | État                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Planification : une fois, chaque jour, chaque semaine (jours choisis), à intervalle régulier ; fuseau horaire | ✅                                                                                                |
| Cible : nouveau fil dans un dossier, ou fil existant                                                          | ✅                                                                                                |
| Liste filtrable (actives, en pause, terminées), mise en pause, modification, suppression                      | ✅                                                                                                |
| Création par l'agent après un entretien avec l'utilisateur (outils ci-dessus)                                 | ✅                                                                                                |
| Exécution **uniquement quand l'application est ouverte**                                                      | ✅                                                                                                |
| Exécution application fermée par un daemon `systemd --user`                                                   | 🧱 (unités générées par `user-daemon.ts`, mais `--daemon --run-due` n'est pas géré par `main.ts`) |
| Démarrage à l'ouverture de session (autostart XDG, `--background`)                                            | 🧱 (fichier `.desktop` généré, option `--background` non gérée)                                   |
| Déclencheur `at-login` (briefing du matin)                                                                    | 📐                                                                                                |

## Compétences et extensions (« Skills and extensions »)

Code : [`src/features/extensions`](../apps/desktop/src/features/extensions).

| Fonctionnalité                                                                            | État |
| ----------------------------------------------------------------------------------------- | ---- |
| Liste des compétences (skills) et des extensions Pi chargées, avec compteurs et recherche | ✅   |
| Fiche détaillée d'une compétence ou d'une extension ; activation et désactivation         | ✅   |
| Recharger les extensions d'un dossier                                                     | ✅   |
| Notices et erreurs de chargement des extensions                                           | ✅   |
| Catalogue de plugins et de savoirs de l'agence, filtré par la configuration centrale      | 📐   |

## Réglages

Code : [`src/features/settings`](../apps/desktop/src/features/settings). Rubriques de navigation :

| Rubrique                                                 | Contenu                                                                                                    | État |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| General                                                  | Portée des réglages de modèle (globale ou par dépôt), commandes `/` des compétences, shell du terminal     | ✅   |
| Appearance                                               | Langue (système, anglais, chinois), thème clair/sombre, palettes de couleurs                               | ✅   |
| Notifications                                            | Fin de tâche en arrière-plan, échecs, demandes d'action ; accès aux notifications (écran pensé pour macOS) | ✅   |
| Keyboard shortcuts                                       | Liste des raccourcis                                                                                       | ✅   |
| Providers                                                | Connexion aux fournisseurs par OAuth ou clé d'API (stockées par Pi dans `auth.json`)                       | ✅   |
| Models                                                   | Modèles activés, modèle par défaut, niveaux de raisonnement                                                | ✅   |
| Points d'accès personnalisés                             | Serveur compatible OpenAI (Chat Completions, Responses), Anthropic Messages, vLLM, Ollama (`models.json`)  | ✅   |
| MCP servers                                              | Ajout, modification et suppression de serveurs MCP globaux ou de projet (`mcp.json`)                       | ✅   |
| Skills and extensions                                    | Voir la section précédente                                                                                 | ✅   |
| Compte (OIDC), mail, coffre de secrets, mémoire, plugins | —                                                                                                          | 📐   |

## Mises à jour

Code : [`platform/update-checker.ts`](../apps/desktop/electron/platform/update-checker.ts),
[`platform/release-source.ts`](../apps/desktop/electron/platform/release-source.ts).

| Fonctionnalité                                                                                                                                                            | État                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Vérification de la dernière release **stable** de `sicDANGBE/jarvis` (15 s après le lancement, puis toutes les 4 h), **seulement si la politique réseau autorise GitHub** | ✅                                     |
| Sous Linux : notification puis ouverture de la page de la release (pas de mise à jour automatique de l'AppImage)                                                          | ✅                                     |
| Sous Windows : téléchargement vérifié (manifeste et SHA-256) et installation au redémarrage                                                                               | ✅ (non construit par la CI de Jarvis) |

L'API `/releases/latest` ignore les pré-releases : une installation `nightly` n'est jamais avertie
d'une nouvelle `nightly`, et tant qu'aucune release stable `vX.Y.Z` n'existe, la vérification
manuelle répond « No stable Jarvis release has been published yet ».

## Socle Jarvis (sécurité et intégration à la session)

Détails : [securite.md](securite.md).

| Fonctionnalité                                                                                              | État |
| ----------------------------------------------------------------------------------------------------------- | ---- |
| Lanceur Linux qui choisit la sandbox Chromium ; profil AppArmor optionnel pour l'admin                      | ✅   |
| Configuration centrale signée Ed25519 (prompt système, sorties réseau, modèles, paquets, savoirs)           | 🧱   |
| Passerelle réseau : intranet seulement par défaut, chaque tentative d'accès réseau signalée à l'utilisateur | ✅   |
| Garde de sortie réseau (liste d'hôtes autorisés, refus des redirections hors liste)                         | 🧱   |
| Coffre de secrets chiffré, références `{{secret:nom}}`, masquage des sorties                                | 🧱   |
| Filtre « ceci ressemble à un secret » pour la mémoire                                                       | 🧱   |
| Refus de démarrer en root (message, arrêt avant toute écriture)                                             | ✅   |
| Autostart et daemon `systemd --user`                                                                        | 🧱   |
| Connexion OIDC, carte à puce PKCS#11                                                                        | 📐   |

## Modules métier

| Module                                                         | État |
| -------------------------------------------------------------- | ---- |
| Documents LibreOffice (création, conversion PDF/DOCX, modèles) | 📐   |
| Mail (IMAP/SMTP, envoi soumis à validation)                    | 📐   |
| Diagrammes (Mermaid, draw.io)                                  | 📐   |
| Jira                                                           | 📐   |
| Mémoire validée par l'utilisateur (`pi-memory`)                | 📐   |
| Mode « non développeur » (terminal, diff et worktrees masqués) | 📐   |
