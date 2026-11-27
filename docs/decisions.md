# Décisions

Ce document consigne les décisions prises sur la direction de Jarvis. Il sert de base au plan de
développement et aux issues. Chaque décision indique ce qui a été décidé, ce que cela implique
dans le code et ce qui reste à préciser. L'état actuel du code est décrit dans
[fonctionnalites.md](fonctionnalites.md) et [securite.md](securite.md).

| N°                                                              | Sujet                                               | Date       |
| --------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| [D1](#d1--source-de-la-configuration)                           | Source de la configuration                          | 2026-11-26 |
| [D2](#d2--langue)                                               | Langue                                              | 2026-11-26 |
| [D3](#d3--mode-développeur)                                     | Mode développeur                                    | 2026-11-26 |
| [D4](#d4--configuration-propre-à-jarvis-et-initialisation)      | Configuration propre à Jarvis et initialisation     | 2026-11-26 |
| [D5](#d5--coffre-fort-de-secrets)                               | Coffre-fort de secrets                              | 2026-11-26 |
| [D6](#d6--authentification)                                     | Authentification                                    | 2026-11-26 |
| [D7](#d7--plateformes-et-mises-à-jour)                          | Plateformes et mises à jour                         | 2026-11-26 |
| [D8](#d8--exécution-des-tâches-planifiées-hors-application)     | Exécution des tâches planifiées hors application    | 2026-11-26 |
| [D9](#d9--autonomie-de-lappimage)                               | Autonomie de l'AppImage                             | 2026-11-26 |
| [D10](#d10--projets-espaces-de-travail-et-discussions)          | Projets, espaces de travail et discussions          | 2026-11-26 |
| [D11](#d11--conversations-annexes)                              | Conversations annexes                               | 2026-11-26 |
| [D12](#d12--traçabilité-des-actions)                            | Traçabilité des actions                             | 2026-11-26 |
| [D13](#d13--administration-et-catalogue-doutils)                | Administration et catalogue d'outils                | 2026-11-26 |
| [D14](#d14--outils-bureautiques-et-navigateur)                  | Outils bureautiques et navigateur                   | 2026-11-26 |
| [D15](#d15--réglages-administrés-et-paramètres-de-lapplication) | Réglages administrés et paramètres de l'application | 2026-11-27 |
| [D16](#d16--accès-internet-et-traces-des-requêtes)              | Accès Internet et traces des requêtes               | 2026-11-27 |
| [D17](#d17--profils-dagent)                                     | Profils d'agent                                     | 2026-11-27 |
| [D18](#d18--voix-et-reconnaissance-de-texte)                    | Voix et reconnaissance de texte                     | 2026-11-27 |

## D1 — Source de la configuration

**Décision.** La configuration de Jarvis (prompt système, sorties réseau autorisées, modèles,
paquets, savoirs, options) a deux sources :

- **en développement** : un fichier local, utilisé avec un **utilisateur simulé administrateur**
  (`isAdmin: true`) ;
- **en production** : un **serveur de configuration** hébergé sur le cloud de l'agence, à créer
  plus tard.

**Conséquences.**

- Le format signé existant ([`managed-config.ts`](../apps/desktop/electron/jarvis/managed-config.ts))
  reste la référence pour le serveur. Le mode local doit avoir le même schéma, pour qu'un bundle
  passe du développement à la production sans modification.
- La configuration locale n'est acceptée que par une **version de développement**. Une version de
  production l'ignore : un utilisateur ne peut pas contourner la politique de l'agence en déposant
  un fichier.
- L'utilisateur simulé `isAdmin: true` **préfigure les rôles** : le code s'appuie dès maintenant
  sur une identité porteuse de rôles, qui viendra plus tard de l'authentification
  ([D6](#d6--authentification)) et de la réponse d'initialisation.
- Le serveur n'existe pas encore : son API (voir [D4](#d4--configuration-propre-à-jarvis-et-initialisation))
  doit être spécifiée dans le dépôt pour que client et serveur puissent avancer séparément.

**Précisions (2026-11-26).** Une première version prévoyait un jeton admin UUID v4. Elle est
**remplacée** par l'utilisateur simulé `isAdmin: true`, qui préfigure les rôles.

**À préciser.** Le moyen de distinguer une version de développement d'une version de production
(variable de build, canal de publication). La protection contre le retour à un
bundle plus ancien (numéro de séquence ou comparaison d'`issuedAt`), signalée dans
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

**Précisions (2026-11-26).** On **garde le catalogue anglais** pour le moment, à côté du
français par défaut. Le catalogue `zh-CN` n'a plus d'usage.

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

**Précisions (2026-11-26).** Le contrat de l'appel d'initialisation sera **défini ensemble, à
partir des besoins**. Il porte au moins la configuration, les modèles (servis par LiteLLM, voir
[D6](#d6--authentification)), la liste des outils validés ([D13](#d13--administration-et-catalogue-doutils))
et les métadonnées de mise à jour ([D7](#d7--plateformes-et-mises-à-jour)).

**À préciser.** Authentification de l'appel, fréquence de rafraîchissement, comportement hors
ligne.

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

**Précisions (2026-11-26).** La session de l'utilisateur est **déjà déverrouillée** par le SSO,
l'OIDC ou la carte PKCS#11 : pas de mot de passe maître supplémentaire. Les secrets d'un
**projet** sont portés par ce projet ([D10](#d10--projets-espaces-de-travail-et-discussions)).

**À préciser.** L'organisation du coffre (groupes, champs par entrée, pièces jointes), la durée
de validité d'une autorisation ponctuelle.

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

**Précisions (2026-11-26).** Les modèles sont servis par une passerelle **LiteLLM** : c'est la
destination principale à authentifier, avec le serveur de configuration. La session est ouverte
par SSO, OIDC ou PKCS#11 avant l'usage de Jarvis.

**À préciser.** Les autres destinations (outils internes), le nom et le contenu des en-têtes, le
comportement à l'expiration de la session.

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

**Précisions (2026-11-26).** Le marqueur `forced` est porté par les **métadonnées du serveur
distant**, pour les mises à jour de l'application **et** pour celles de la configuration. Il
servira surtout aux correctifs de bugs et de vulnérabilités.

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

**Précisions (2026-11-26).** Pour le moment, seul le **fonctionnement local** est concerné ; les
espaces de travail SSH sont hors périmètre.

**À préciser.** Le comportement des fonctions qui s'appuient sur des outils du poste (Git pour la
revue et les worktrees, éditeurs, suite bureautique) : dépendance assumée, ou fonction masquée si
l'outil manque.

## D10 — Projets, espaces de travail et discussions

**Décision.** Trois niveaux d'organisation :

| Niveau                | Rôle                                                                                   | Contient                       |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| **Projet**            | Unité de gestion la plus haute. Porte les **secrets**, les **droits** et les réglages. | Une liste d'espaces de travail |
| **Espace de travail** | Le **dossier de contexte de l'IA**. Peut être un **dépôt Git**.                        | 1 à n discussions              |
| **Discussion**        | Une conversation, avec ses conversations annexes ([D11](#d11--conversations-annexes)). | Des conversations annexes      |

- Une discussion appartient **toujours** à un espace de travail.
- Un projet regroupe des dossiers, **de même niveau ou non** dans l'arborescence du disque.
- Un espace de travail peut être créé seul, puis **rattaché à un projet** plus tard ; il hérite
  alors des secrets et des droits du projet.
- La barre latérale trie les discussions **par projet**, **par espace de travail** ou **par date**,
  au choix de l'utilisateur.

**Conséquences.** L'espace de travail correspond à l'actuel « workspace » (un dossier et ses fils),
déjà pris en charge, y compris pour les dépôts Git (revue, worktrees). Il faut ajouter le projet au
catalogue ([`@jarvis/catalogs`](../packages/catalogs)), définir l'héritage des secrets
([D5](#d5--coffre-fort-de-secrets)) et des droits, et revoir la barre latérale.

**Précisions (2026-11-26).** Ces points remplacent la première version de cette décision, qui
permettait des discussions rattachées directement à un projet.

**À préciser.** Ce que recouvrent les « droits » d'un projet (outils autorisés, secrets, modèles,
partage entre utilisateurs ?). Un même dossier peut-il appartenir à plusieurs projets ?

## D11 — Conversations annexes

**Décision.** Une discussion **principale** peut porter des **conversations annexes** (filles) :

- l'utilisateur sélectionne une partie de la conversation (une notion qu'il ne maîtrise pas, un
  passage d'un compte rendu) et ouvre une conversation annexe dessus ;
- la conversation annexe est traitée **en parallèle**, **sans polluer** le fil ni perturber le
  travail de la conversation principale ;
- elle ne dépend **pas d'un espace de travail** : son contexte est **limité**, pris dans la
  discussion (la sélection et ce qui l'entoure), sans accès aux fichiers du dossier ;
- un **bouton** (ou une demande explicite) **réintègre** le contenu de la conversation annexe dans
  la conversation principale ;
- **un seul niveau** : une conversation annexe n'a pas elle-même de conversation annexe.

**Conséquences.** Le code a déjà deux briques proches : les fils enfants créés par l'agent
(orchestration, `parentSessionId`) et la sélection « ajouter au chat » (`Ctrl+L`,
[`annotations/`](../apps/desktop/src/features/conversation/annotations)). Une conversation annexe
est une session Pi sans dossier ni outils de fichiers, amorcée avec la sélection ; la
réintégration ajoute un message explicite dans la conversation principale.

**À préciser.** La forme de la réintégration (résumé généré ou texte choisi), l'affichage
(panneau latéral, onglet), les outils éventuellement autorisés (recherche web ?).

## D12 — Traçabilité des actions

**Décision.** Les actions du harness peuvent être **tracées** : commandes exécutées, appels
d'outils, accès aux secrets.

- **Désactivée par défaut.** Elle s'active **par la configuration centrale**
  ([D1](#d1--source-de-la-configuration)), jamais par l'utilisateur.
- Durée de conservation **configurable**, **14 jours** par défaut.
- Possibilité de **journaliser les commandes sans leur contenu** : le contenu reste privé, au moins
  dans un premier temps.
- La conservation des traces doit **respecter la législation** applicable.

**Cadre légal relevé (France).** Ces éléments sont une première lecture, à valider avec le
délégué à la protection des données (DPO) et un juriste :

- **Information préalable des salariés** : aucune information personnelle sur un salarié ne peut
  être collectée par un dispositif qui n'a pas été porté préalablement à sa connaissance
  (Code du travail, art. L1222-4). L'activation de la traçabilité doit donc être annoncée, et
  Jarvis devrait l'indiquer à l'utilisateur quand elle est active.
- **Consultation du CSE** : dans une entreprise d'au moins 50 salariés, le comité social et
  économique est informé et consulté **avant** la mise en place d'un moyen de contrôle de
  l'activité des salariés (art. L2312-38). Un dispositif mis en place sans cette procédure ne
  peut pas servir de preuve devant le conseil de prud'hommes.
- **Durée de conservation** : la CNIL recommande de conserver les journaux de traçabilité des
  accès et des actions **entre six mois et un an**, au-delà sur justification documentée
  (délibération n° 2021-122 du 14 octobre 2021). La valeur par défaut de **14 jours est bien plus
  courte** : elle convient à un usage de diagnostic, mais pas à la traçabilité de sécurité visée
  par la CNIL. La configuration doit permettre de monter à un an.
- **RGPD** : minimisation (journaliser sans le contenu par défaut va dans ce sens), finalité
  déclarée au registre des traitements, sécurité des journaux eux-mêmes (accès restreint,
  intégrité).

**Conséquences.** Il faut un journal d'audit local, en ajout seul, protégé contre la
modification, avec rotation selon la durée configurée ; un écran pour le consulter ; une mention
visible quand la traçabilité est active. La remontée vers le serveur reste à décider.

**À préciser.** La remontée des traces vers le serveur, qui peut les consulter (l'utilisateur,
un administrateur), la valeur par défaut quand la traçabilité est activée.

## D13 — Administration et catalogue d'outils

**Décision.**

- Le serveur **valide la liste des outils** disponibles et peut en **proposer** d'autres.
- Des **sessions administrateur** donnent bien plus d'options que les sessions ordinaires.
- On doit pouvoir **proposer facilement des serveurs MCP** et une **bibliothèque de plugins**.

**Conséquences.** La liste des outils autorisés fait partie de la réponse d'initialisation
([D4](#d4--configuration-propre-à-jarvis-et-initialisation)). Le rôle administrateur vient de
l'identité ([D6](#d6--authentification)), par exemple un groupe Keycloak. L'écran **MCP servers**
et la page **Skills and extensions** existants servent de base au catalogue.

**À préciser.** La liste des options réservées aux administrateurs, le format d'un plugin du
catalogue (paquet Pi, serveur MCP, compétence), la procédure de validation.

## D14 — Outils bureautiques et navigateur

**Décision.**

- Jarvis intègre un **navigateur**.
- Il propose des outils **draw.io** et une **suite bureautique** (traitement de texte, tableur
  type Excel/Calc, présentation) basée sur **LibreOffice/OpenOffice**.
- L'utilisateur peut **fournir sa propre suite bureautique**.

**Conséquences.** Une suite bureautique embarquée alourdirait fortement l'AppImage
([D9](#d9--autonomie-de-lappimage)) : à arbitrer entre une suite fournie par le poste (détectée,
ou choisie par l'utilisateur) et une suite embarquée. Le navigateur intégré s'appuierait sur
Electron (`WebContentsView`), avec les règles de sorties réseau ([`egress-guard.ts`](../apps/desktop/electron/jarvis/egress-guard.ts)).

**Précisions (2026-11-26).** Le navigateur est d'abord **un outil de l'agent**. Il sert aussi à
l'utilisateur pour **automatiser des actions sur des sites qui n'ont pas de serveur MCP**.

**À préciser.** L'outil draw.io (éditeur embarqué ou rendu de fichiers), le mode d'intégration de la
suite bureautique (ouverture externe, conversion en tâche de fond, édition dans Jarvis).

## D15 — Réglages administrés et paramètres de l'application

**Décision.**

- Chaque réglage de Jarvis peut être **administré depuis le serveur de paramètres**, pour tous les
  utilisateurs ou une partie d'entre eux. Pour un réglage, le serveur peut :
  - l'**activer** ou fixer sa valeur ;
  - en faire la **valeur par défaut** ;
  - **autoriser ou interdire** sa modification par l'utilisateur.
- Ces réglages sont visibles dans **Application › Paramètres**. Cet onglet permet de **contrôler
  complètement le fonctionnement du harness** (accès réseau, traces, outils, compétences, serveurs
  MCP, profils d'agent, voix…) et montre les **outils disponibles** : navigateur, draw.io, trousseau
  de clés, suite bureautique, etc.

**Conséquences.** Chaque réglage devient un triplet _valeur / valeur par défaut / verrouillé_,
résolu dans l'ordre : réglage verrouillé par le serveur, choix de l'utilisateur, défaut du serveur,
défaut de Jarvis. L'interface affiche un réglage verrouillé comme tel (non modifiable, avec sa
provenance). Le schéma de la configuration ([D1](#d1--source-de-la-configuration),
[D4](#d4--configuration-propre-à-jarvis-et-initialisation)) porte ces triplets ; la configuration
locale de développement aussi.

**À préciser.** Le ciblage « une partie des utilisateurs » (groupes Keycloak, rôles), la liste des
réglages de la première version.

## D16 — Accès Internet et traces des requêtes

**Décision.**

- L'**accès à Internet est un réglage** ([D15](#d15--réglages-administrés-et-paramètres-de-lapplication)),
  administrable par le serveur pour tout ou partie des utilisateurs. L'intranet reste joignable dans
  tous les cas.
- Pendant la phase de développement, Internet peut être activé (développement depuis le domicile).
- **Quand Internet est activé, toutes les requêtes vers Internet sont tracées** sur le poste, avec
  une **rétention de 48 heures**, et peuvent être **envoyées à un serveur de traces**.
- Si l'envoi vers le serveur de traces est activé et que les traces n'ont **pas pu être envoyées
  depuis plus de 48 heures**, le harness **se met en défaut** : il cesse de joindre Internet et
  l'indique à l'utilisateur.

**Conséquences.** La passerelle réseau ([#40](https://github.com/sicDANGBE/jarvis/issues/40)) enregistre
déjà chaque tentative en mémoire ; il faut un journal sur disque (en ajout seul, rotation à 48 h),
l'envoi vers le serveur de traces (par la passerelle elle-même, donc lui aussi tracé et soumis à la
politique) et l'état « en défaut ». Le contenu des requêtes n'est pas tracé, seulement leurs
métadonnées (date, hôte, adresse, port, décision, origine), conformément à
[D12](#d12--traçabilité-des-actions). Le cadre légal de D12 s'applique (information des salariés,
CSE).

**À préciser.** L'effet exact du défaut (Internet seul coupé, ou harness entier arrêté), le
protocole du serveur de traces.

## D17 — Profils d'agent

**Décision.** En plus des serveurs MCP et des **compétences** (nom français des _skills_), on crée
des **profils d'agent** : « Expert Excel », « Expert développement », etc. Selon le profil, le harness
charge plus ou moins de capacités.

**Avis.** L'idée est bonne : c'est le mécanisme des agents spécialisés (sous-agents, GPTs
personnalisés). Trois précautions :

- un profil est un **paquet de configuration**, pas un programme : prompt système, modèle et niveau
  de raisonnement, outils, compétences et serveurs MCP autorisés, mode développeur. Le mode
  développeur ([D3](#d3--mode-développeur)) devient naturellement le profil « Expert
  développement » ;
- il faut un **profil généraliste par défaut** et ne pas obliger l'utilisateur à choisir avant chaque
  question ; Jarvis peut **proposer** un profil adapté à la demande, l'utilisateur garde la main ;
- les profils sont **définis et validés par l'agence** (serveur de paramètres,
  [D13](#d13--administration-et-catalogue-doutils)) ; un utilisateur ne peut qu'**en restreindre** un,
  jamais lui donner plus de droits que ceux de son projet.

**Conséquences.** Le profil se choisit par discussion (comme le modèle aujourd'hui) et se mémorise
par projet ou espace de travail ; il fixe la liste d'outils transmise à Pi pour la session.

**À préciser.** Les profils de la première version, la possibilité pour un utilisateur d'en créer.

## D18 — Voix et reconnaissance de texte

**Décision.** En plus du texte, Jarvis accepte :

- les **images**, avec reconnaissance de texte (**OCR**) ;
- la **voix** de l'utilisateur (**reconnaissance vocale**, _speech to text_) ;
- et peut **répondre à voix haute** (**synthèse vocale**, _text to speech_) si l'utilisateur le
  souhaite.

**Conséquences.** Pour respecter « aucune donnée ne sort du poste » et l'intranet par défaut, ces
traitements doivent tourner **sur le poste** (moteurs locaux embarqués) ou sur un **service de
l'intranet** déclaré dans la configuration, jamais sur un service Internet par défaut. Les images
sont déjà acceptées en pièce jointe et transmises aux modèles qui les lisent ; l'OCR sert aux modèles
sans vision et aux documents numérisés. Chaque fonction est un réglage
([D15](#d15--réglages-administrés-et-paramètres-de-lapplication)). Les moteurs locaux alourdissent
l'AppImage ([D9](#d9--autonomie-de-lappimage)) : modèles téléchargés à la demande depuis l'intranet,
ou embarqués.

**À préciser.** Moteurs retenus (par exemple Tesseract pour l'OCR, Whisper pour la reconnaissance
vocale, Piper pour la synthèse), langues, embarqués ou téléchargés.
