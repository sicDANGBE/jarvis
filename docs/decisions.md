# Décisions

Ce document consigne les décisions prises sur la direction de Jarvis. Il sert de base au plan de
développement et aux issues. Chaque décision indique ce qui a été décidé, ce que cela implique
dans le code et ce qui reste à préciser. L'état actuel du code est décrit dans
[fonctionnalites.md](fonctionnalites.md) et [securite.md](securite.md).

| N°                                                          | Sujet                                            | Date       |
| ----------------------------------------------------------- | ------------------------------------------------ | ---------- |
| [D1](#d1--source-de-la-configuration)                       | Source de la configuration                       | 2026-11-26 |
| [D2](#d2--langue)                                           | Langue                                           | 2026-11-26 |
| [D3](#d3--mode-développeur)                                 | Mode développeur                                 | 2026-11-26 |
| [D4](#d4--configuration-propre-à-jarvis-et-initialisation)  | Configuration propre à Jarvis et initialisation  | 2026-11-26 |
| [D5](#d5--coffre-fort-de-secrets)                           | Coffre-fort de secrets                           | 2026-11-26 |
| [D6](#d6--authentification)                                 | Authentification                                 | 2026-11-26 |
| [D7](#d7--plateformes-et-mises-à-jour)                      | Plateformes et mises à jour                      | 2026-11-26 |
| [D8](#d8--exécution-des-tâches-planifiées-hors-application) | Exécution des tâches planifiées hors application | 2026-11-26 |
| [D9](#d9--autonomie-de-lappimage)                           | Autonomie de l'AppImage                          | 2026-11-26 |

## D1 — Source de la configuration

**Décision.** La configuration de Jarvis (prompt système, sorties réseau autorisées, modèles,
paquets, savoirs, options) a deux sources :

- **en développement** : un fichier local, dont l'usage est protégé par un **jeton admin** ;
- **en production** : un **serveur de configuration** hébergé sur le cloud de l'agence, à créer
  plus tard.

**Conséquences.**

- Le format signé existant ([`managed-config.ts`](../apps/desktop/electron/jarvis/managed-config.ts))
  reste la référence pour le serveur. Le mode local doit avoir le même schéma, pour qu'un bundle
  passe du développement à la production sans modification.
- Le jeton admin doit être exigé à chaque chargement d'une configuration locale. Sans jeton valide,
  la configuration locale est ignorée : un utilisateur ne peut pas contourner la politique de
  l'agence en déposant un fichier.
- Le serveur n'existe pas encore : son API (voir [D4](#d4--configuration-propre-à-jarvis-et-initialisation))
  doit être spécifiée dans le dépôt pour que client et serveur puissent avancer séparément.

**À préciser.** La forme du jeton admin (secret partagé, clé de signature locale, jeton émis par
le serveur) et l'endroit où il est saisi ou déposé. La protection contre le retour à un bundle
plus ancien (numéro de séquence ou comparaison d'`issuedAt`), signalée dans
[securite.md](securite.md#configuration-centrale-signée-ed25519--).

## D2 — Langue

**Décision.** Le **français remplace intégralement l'anglais** : dans l'interface, dans les
messages de l'application et dans le prompt système. Par défaut, l'agent est invité à répondre en
français.

**Conséquences.**

- Un catalogue `fr` est ajouté dans [`src/i18n/messages`](../apps/desktop/src/i18n/messages) et
  devient la langue par défaut. Le sort des catalogues `en` et `zh-CN` est à décider : les retirer
  simplifie la maintenance ; les garder ne coûte que leur mise à jour.
- Les textes encore codés en dur hors catalogue (process main, dialogues natifs, notifications,
  descriptions des outils donnés à l'agent, messages d'erreur) passent en français. Le test
  `renderer-copy` sert de garde pour le renderer ; un équivalent est à prévoir pour le process
  main.
- La consigne « réponds en français » fait partie du prompt système de l'agence
  ([D1](#d1--source-de-la-configuration)), avec une valeur par défaut intégrée à Jarvis quand aucune
  configuration n'est chargée.

**À préciser.** Le maintien ou non d'un sélecteur de langue dans les réglages.

## D3 — Mode développeur

**Décision.** Le **mode développeur est conservé** (terminal, revue des modifications, worktrees,
outils de développement). Il est activé ou non selon le besoin exprimé par l'utilisateur, sans
être imposé.

**Conséquences.**

- L'interface par défaut est pensée pour un non-technicien : les outils de développement sont
  disponibles mais non mis en avant.
- Le champ `features.developerMode` du bundle de configuration reste la façon dont l'agence peut
  autoriser ou non ce mode.

**À préciser.** Le déclencheur exact : un réglage manuel, ou une activation proposée quand la
demande de l'utilisateur le justifie (par exemple quand l'agent veut ouvrir un terminal). La
liste des outils concernés (terminal, revue, worktrees, outil `bash` de Pi, SSH).

## D4 — Configuration propre à Jarvis et initialisation

**Décision.** Jarvis est **isolé dans sa propre configuration** : il ne partage plus
`~/.pi/agent` avec Pi lancé en terminal. Cette configuration doit pouvoir être fournie par le
serveur.

Scénario cible :

1. le client s'installe ;
2. l'adresse du serveur figure dans la **configuration initiale** de Jarvis ;
3. au premier démarrage, un **appel d'initialisation** récupère la configuration, les modèles et
   les autres informations nécessaires.

**Conséquences.**

- Le dossier de l'agent Pi utilisé par Jarvis devient un dossier propre à Jarvis (par exemple sous
  `~/.config/Jarvis`), au lieu de `~/.pi/agent`. Le pilote passe déjà par un point central
  (`PI_CODING_AGENT_DIR`, [`compat/`](../packages/pi-sdk-driver/src/compat)) qu'il faudra
  généraliser.
- Les fournisseurs, modèles, serveurs MCP et paquets ne sont plus réglés seulement à la main : ils
  peuvent venir de la réponse d'initialisation.
- La découverte des sessions Pi existantes d'un dossier (créées en terminal) n'a plus d'objet par
  défaut et devra être revue.
- Il faut définir comment la configuration initiale est livrée avec le client (fichier à côté de
  l'AppImage, paramètre de premier lancement, valeur intégrée au build de l'agence).

**À préciser.** Le contrat de l'appel d'initialisation (authentification, contenu de la réponse,
fréquence de rafraîchissement, comportement hors ligne).

## D5 — Coffre-fort de secrets

**Décision.** Jarvis dispose d'un **coffre-fort visible dans l'interface**, sur le modèle de
KeePass. L'agent peut **utiliser** un secret **sans jamais accéder à son contenu**. Toute
utilisation d'un secret exige :

- soit une **autorisation explicite** de l'utilisateur au moment de l'usage ;
- soit une **autorisation préalable** que l'utilisateur a enregistrée dans l'environnement de la
  **discussion** ou du **projet**, pour tel ou tel secret.

**Conséquences.**

- Le socle existant ([`secret-vault.ts`](../apps/desktop/electron/jarvis/secret-vault.ts)) apporte
  déjà le chiffrement `safeStorage`, les références `{{secret:nom}}`, la résolution limitée aux
  noms autorisés et le masquage des sorties. Il faut y ajouter :
  - un écran de gestion (créer, modifier, supprimer, rechercher, voir les usages) ;
  - un dialogue d'autorisation au moment de l'usage ;
  - un registre des autorisations par discussion et par projet, consultable et révocable.
- Les identifiants des fournisseurs et des serveurs MCP, aujourd'hui dans `auth.json` et
  `mcp.json`, ont vocation à passer dans le coffre.
- Les limites du masquage relevées dans [securite.md](securite.md#coffre-de-secrets--) restent à
  traiter.

**À préciser.** L'organisation du coffre (groupes, champs par entrée, pièces jointes), un
éventuel mot de passe maître en plus du trousseau du système, la durée de validité d'une
autorisation ponctuelle.

## D6 — Authentification

**Décision.** L'authentification de l'utilisateur est **entièrement configurable** et peut
combiner :

- **plusieurs fournisseurs Keycloak** (OIDC) ;
- la **carte à puce PKCS#11** ;
- des **en-têtes HTTP** imposés sur certaines requêtes.

Jarvis **encapsule** l'authentification : il authentifie l'utilisateur lui-même, à la place du
proxy d'authentification utilisé aujourd'hui avec opencode.

**Conséquences.**

- La configuration ([D1](#d1--source-de-la-configuration), [D4](#d4--configuration-propre-à-jarvis-et-initialisation))
  décrit les fournisseurs d'identité, les règles de choix entre eux et les en-têtes à injecter, par
  hôte de destination.
- Les jetons (refresh tokens notamment) sont rangés dans le coffre ([D5](#d5--coffre-fort-de-secrets)).
- Les appels de l'agent vers les modèles et les outils doivent passer par un point où Jarvis peut
  ajouter l'authentification. Aujourd'hui, Pi appelle les fournisseurs directement ; ce point
  d'injection est à concevoir dans le pilote, sans réécrire Pi.
- Le schéma OIDC et PKCS#11 de la [spécification](specification.md#7-bis-authentification--oidc-et-pkcs11)
  reste la base ; il passe d'un seul fournisseur à plusieurs.

**À préciser.** La liste des destinations à authentifier (serveur de configuration, passerelle de
modèles, outils internes), le nom et le contenu des en-têtes, le comportement à l'expiration de la
session.

## D7 — Plateformes et mises à jour

**Décision.** Les cibles **macOS et Windows sont conservées** à côté de Linux. La cible finale est
une **mise à jour automatique** :

- quand une nouvelle version est disponible, Jarvis regarde si elle porte le marqueur **`forced`** ;
- si oui, il la récupère et l'installe dès que possible ;
- sinon, il demande à l'utilisateur.

Si la mise à jour automatique de l'AppImage l'exige, l'**AppImage est signée**.

**Conséquences.**

- La vérification actuelle ([`update-checker.ts`](../apps/desktop/electron/platform/update-checker.ts))
  se contente d'ouvrir la page de la release sous Linux ; il faut un vrai mécanisme de
  téléchargement, de vérification et de remplacement de l'AppImage, et l'étendre à macOS.
- Le marqueur `forced` doit être porté par la release (manifeste ou métadonnée), et le canal suivi
  doit être choisi : aujourd'hui seules les releases stables sont vues, jamais les nightly.
- L'authenticité des mises à jour ne peut pas reposer sur `SHA256SUMS.txt` publié dans la même
  release : une signature (de l'AppImage ou du manifeste) est nécessaire.
- La CI doit construire et vérifier les cibles macOS et Windows ; la signature macOS demande un
  compte développeur Apple, la signature Windows un certificat.

**À préciser.** Le moment d'installation d'une version `forced` (au prochain démarrage, ou
immédiatement avec redémarrage), et la clé ou le certificat de signature.

## D8 — Exécution des tâches planifiées hors application

**Décision.** Choix délégué, avec trois critères : sécurité, praticité, efficacité. Retenu :

- un **mode sans fenêtre dans le même binaire** (`jarvis --daemon --run-due`), lancé par un timer
  `systemd --user` ;
- le daemon **refuse root** et ne demande jamais d'élévation ;
- un **verrou de fichier** garantit qu'un seul exécuteur traite les tâches à la fois, qu'il
  s'agisse de l'application ouverte ou du daemon ;
- sans `systemd --user`, **repli sur le mode « application ouverte »**, comme aujourd'hui.

**Raisons.**

- Sécurité : aucun droit root, aucun service système, une seule surface de code à auditer.
- Praticité : rien de plus à installer que l'AppImage ; les fichiers sont écrits sous `$HOME`.
- Efficacité : le daemon ne fait que traiter les tâches arrivées à échéance puis s'arrête ; le
  timer `Persistent=true` rattrape les passages manqués.

**Conséquences.** `main.ts` doit traiter `--daemon --run-due` (et `--background` pour
l'autostart) avant de créer une fenêtre. Le socle
[`user-daemon.ts`](../apps/desktop/electron/jarvis/user-daemon.ts) fournit déjà les unités et
l'autostart.

**À préciser.** Le mode d'exécution d'une tâche par le daemon : session Pi sans interface, avec
les outils et les autorisations de secrets de la tâche, et compte rendu déposé dans l'historique.

## D9 — Autonomie de l'AppImage

**Décision.** L'AppImage doit être **autonome** : aucune installation de Pi ni de Node n'est
requise sur le poste.

**Conséquences.**

- L'étape « Installer Pi » disparaît du [README](../README.md) et de
  [exploitation.md](exploitation.md).
- Le lanceur de sous-agents
  ([`pi-subagent-launcher.cjs`](../apps/desktop/resources/pi-subagent-launcher.cjs)) cherche
  aujourd'hui `pi` et `node` dans le `PATH` : il doit utiliser le runtime embarqué.
- Les espaces de travail SSH demandent aujourd'hui Node et Pi sur la machine distante ; leur cas
  est à trancher séparément, la décision portant sur le poste local.

**À préciser.** Le comportement des fonctions qui s'appuient sur des outils du poste (Git pour la
revue et les worktrees, éditeurs, `soffice` prévu pour les documents) : dépendance assumée, ou
fonction masquée si l'outil manque.
