# Sécurité

Ce document décrit les mécanismes de sécurité présents dans le code de Jarvis, leur état réel et
leurs limites connues. Il distingue ce qui protège déjà l'application de ce qui n'existe encore
que sous forme de socle (code testé mais non branché) ou de spécification.

| Mécanisme                                          | État                  | Code                                                                                             |
| -------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Isolation du renderer (sandbox, contextIsolation)  | ✅ Opérationnel       | [`electron/main.ts`](../apps/desktop/electron/main.ts)                                           |
| Validation des IPC, contrôle de la frame émettrice | ✅ Opérationnel       | [`electron/ipc/`](../apps/desktop/electron/ipc)                                                  |
| Isolation des vues d'extension                     | ✅ Opérationnel       | [`electron/extensions/`](../apps/desktop/electron/extensions)                                    |
| Lanceur Linux et sandbox Chromium                  | ✅ Opérationnel       | [`scripts/after-pack-linux-launcher.cjs`](../apps/desktop/scripts/after-pack-linux-launcher.cjs) |
| Profil AppArmor pour l'admin                       | ✅ Fourni, à déployer | [`resources/linux/apparmor-jarvis`](../apps/desktop/resources/linux/apparmor-jarvis)             |
| Configuration signée Ed25519                       | 🧱 Socle non branché  | [`electron/jarvis/managed-config.ts`](../apps/desktop/electron/jarvis/managed-config.ts)         |
| Passerelle réseau (intranet par défaut)            | ✅ Opérationnel       | [`electron/jarvis/network-gateway.ts`](../apps/desktop/electron/jarvis/network-gateway.ts)       |
| `fetch` gardé des outils (`egress-guard`)          | 🧱 Socle non branché  | [`electron/jarvis/egress-guard.ts`](../apps/desktop/electron/jarvis/egress-guard.ts)             |
| Coffre de secrets                                  | 🧱 Socle non branché  | [`electron/jarvis/secret-vault.ts`](../apps/desktop/electron/jarvis/secret-vault.ts)             |
| Daemon et autostart sans root                      | 🧱 Socle non branché  | [`electron/jarvis/user-daemon.ts`](../apps/desktop/electron/jarvis/user-daemon.ts)               |
| OIDC, PKCS#11                                      | 📐 Spécifié           | [specification.md §7 bis](specification.md#7-bis-authentification--oidc-et-pkcs11)               |

Les quatre modules du socle sont couverts par
[`tests/unit/jarvis-security.spec.ts`](../apps/desktop/tests/unit/jarvis-security.spec.ts), exécuté
par la CI et par le workflow AppImage. **Aucun n'est appelé par l'application** : leur protection
n'est donc pas effective aujourd'hui.

## Protections déjà actives

### Fenêtres et renderer

- Les fenêtres sont créées avec `sandbox: true`, `contextIsolation: true` et
  `nodeIntegration: false`. Le renderer n'accède qu'à l'API `window.piApp` exposée par le preload.
- La navigation et l'ouverture de nouvelles fenêtres sont interceptées (`will-navigate`,
  `setWindowOpenHandler`) : les liens externes sont ouverts dans le navigateur du système, et
  seulement s'ils sont en `https`, ou en `http` vers la machine locale.
- Une seule instance de l'application tourne à la fois (`requestSingleInstanceLock`), et un bail
  de session empêche deux processus d'ouvrir le même fil.
- Les gardes de CI interdisent au renderer d'importer Node, Electron ou le code hôte, et rejettent
  tout usage direct d'`ipcMain` hors du module d'enregistrement.

### IPC

Chaque requête est validée dans
[`request-validation.ts`](../apps/desktop/electron/ipc/request-validation.ts) (champs inconnus
refusés, identités malformées refusées). Les IPC sensibles (revue, vues d'extension, modèles
d'atelier, brouillons) passent par
[`mainFrameHandler`](../apps/desktop/electron/ipc/main-frame-ipc.ts), qui refuse tout émetteur
autre que la frame principale de la fenêtre propriétaire.

### Vues d'extension

Une vue d'extension tourne dans une iframe d'origine opaque (`allow-scripts` seulement), reçoit un
`MessagePort` dédié et ses fichiers par le protocole `pi-extension://`, limité au dossier de
l'extension. Une CSP par connexion interdit les requêtes réseau, les workers et les frames
imbriquées. Les actions hôte (ouvrir un fichier, un lien, un fil, créer un brouillon) sont
revérifiées dans le process main et limitées aux fils du dossier de la vue.

> Ces protections concernent la **vue** (le panneau). Le code « backend » d'une extension Pi, lui,
> s'exécute dans le process main avec les droits de l'utilisateur, comme dans Pi en terminal.

## Configuration centrale signée Ed25519 — 🧱

Le serveur de l'agence publie une enveloppe JSON :

```json
{ "payload": "<bundle JSON encodé en base64>", "signature": "<signature Ed25519 en base64>" }
```

La signature porte sur les octets exacts du payload décodé. `openSignedConfig` :

1. vérifie que la clé publique fournie est bien une clé Ed25519 ;
2. vérifie la signature ;
3. valide le contenu (`parseManagedConfig`) :
   - `version` vaut `1` ;
   - `systemPrompt` est une chaîne de 64 000 caractères au plus ;
   - `egress.mode` vaut `open`, `allowlist` (avec `hosts`) ou `deny-all` ;
   - `models.default`, s'il est présent, figure dans `models.allowed` ;
   - chaque entrée de `knowledge` a un `id` et une `url` en `https` ;
   - `packages` est une liste de chaînes ; `features.developerMode` vaut `false` par défaut ;
4. refuse un bundle expiré (`expiresAt`) ou daté de plus de 5 minutes dans le futur (`issuedAt`).

`loadManagedConfig` récupère l'enveloppe en `https` uniquement. Si elle est valide, elle est mise en
cache par écriture atomique ; sinon, l'application retombe sur le dernier bundle valide du cache.
Un bundle invalide n'écrase jamais le cache.

Le format et la procédure de signature sont décrits dans [exploitation.md](exploitation.md).

**Limites connues**

- Rien n'appelle ce code : pas d'URL de serveur, pas d'emplacement de clé publique, pas de
  rafraîchissement horaire, et aucun champ du bundle n'est appliqué (prompt système, modèles,
  paquets, savoirs, mode développeur).
- **Pas de protection contre le retour en arrière** : un bundle plus ancien mais encore valide
  (signé, non expiré) est accepté et remplace le cache. Il n'y a pas de comparaison d'`issuedAt`
  avec le bundle en cache, ni de numéro de séquence.
- Pas de rotation de clé : une seule clé publique est acceptée à la fois.
- Quand le cache est utilisé, sa date d'expiration s'applique toujours : au-delà, l'application
  n'a plus de configuration (`source: "none"`) ; le comportement attendu dans ce cas n'est pas
  défini.

## Passerelle réseau — ✅

Règle du projet : **aucune métrique ni télémétrie ne sort du poste**, **intranet par défaut**, et
**l'utilisateur est averti de chaque tentative d'accès réseau** (issue
[#40](https://github.com/sicDANGBE/jarvis/issues/40)).

[`network-gateway.ts`](../apps/desktop/electron/jarvis/network-gateway.ts) est installée dans
`main.ts` avant tout autre code :

- **Sockets Node du process main** : `net.Socket.prototype.connect` est intercepté. Tout ce qui
  passe par `net`, `tls`, `http`, `https` ou `fetch` (SDK des fournisseurs, Pi, MCP en HTTP,
  vérification de mise à jour) est concerné. Une adresse littérale est jugée immédiatement ; un nom
  d'hôte l'est **après sa résolution DNS et avant la connexion** : un nom qui se résout vers une
  adresse publique est bloqué, quel que soit son nom.
- **Chromium** : chaque session (`session-created`) reçoit un filtre `webRequest` qui applique la
  même politique aux requêtes `http`, `https`, `ws` et `wss` des fenêtres.
- **Politique** : `intranet` par défaut (boucle locale ; adresses privées 10/8, 172.16/12,
  192.168/16, 100.64/10, 169.254/16, IPv6 ULA et lien local ; hôtes autorisés par la
  configuration), `allowlist`, `deny-all` ou `open`. Un nom qui se résout à la fois vers
  l'intranet et vers Internet est bloqué. La politique viendra de la configuration de l'agence
  (issues #3 et #4).
- **Avertissement** : chaque tentative, autorisée ou bloquée, est envoyée aux fenêtres et affichée
  en bas à droite (`NetworkNotices`), avec l'hôte, l'adresse et la raison. La boucle locale n'est pas
  signalée (ce n'est pas du réseau). Les 200 dernières tentatives sont consultables
  (`getNetworkActivity`).
- **Appels propres à Jarvis** : la vérification automatique des mises à jour (GitHub, donc
  Internet) n'est **pas lancée** tant que la politique ne l'autorise pas ; la vérification manuelle
  passe par la passerelle et l'utilisateur voit le refus. Le correcteur orthographique de Chromium,
  qui télécharge ses dictionnaires chez Google, est désactivé.
- **Télémétrie** : Pi n'active aucune télémétrie par défaut (adaptateur « noop ») ; Electron et
  Jarvis n'en envoient pas. La passerelle bloquerait de toute façon un envoi vers Internet.

Tests : [`jarvis-network.spec.ts`](../apps/desktop/tests/unit/jarvis-network.spec.ts) (vraies
sockets) et [`network-gateway.spec.ts`](../apps/desktop/tests/core/network-gateway.spec.ts)
(application Electron).

**Limites connues**

- Les **processus enfants** ont leurs propres sockets et ne passent pas par la passerelle :
  terminal intégré, outil `bash` de Pi, serveurs MCP lancés en stdio, `git`, `ssh`. Pour eux, la
  barrière reste le pare-feu ou le proxy de l'agence.
- Avec un **proxy** (`NODE_USE_ENV_PROXY` côté Node, proxy système côté Chromium), la passerelle
  Node voit l'adresse du proxy et non la destination finale : un proxy de l'intranet qui relaie
  vers Internet n'est pas bloqué côté Node. Côté Chromium, l'URL réelle est contrôlée.
- La décision repose sur la résolution DNS faite par la passerelle ; un serveur DNS de l'intranet
  compromis peut toujours orienter une connexion vers une autre adresse privée.

### Accès Internet et traces — ✅

- L'accès à Internet est le réglage administré `network.internet` (issues #41, #42) : désactivé, seuls
  le poste et l'intranet sont joignables ; activé, la passerelle s'ouvre (sauf `deny-all`), chaque
  accès restant signalé.
- **Internet actif ⇒ chaque tentative vers une adresse Internet est tracée** dans
  `~/.config/Jarvis/traces/internet.jsonl` : date, origine, hôte, adresse, port, décision, raison ;
  **jamais le contenu**. Rétention **48 heures** (purge au démarrage et à chaque envoi).
- Si `traces.internet.upload` est actif, les traces sont envoyées toutes les 15 minutes au serveur
  de traces (`traces.url` de la configuration), par la passerelle. **Sans envoi réussi depuis plus de
  48 heures, le harness se met en défaut** : Internet est coupé (poste et intranet seulement, donc
  seul un point d'accès local reste utilisable) et l'utilisateur est averti, jusqu'au prochain envoi
  réussi.
- Limites : les traces couvrent les connexions vues par la passerelle (process main et Chromium),
  pas celles des processus enfants ; le fichier est protégé par les droits Unix (`0600`), pas
  chiffré ni signé.

### `fetch` gardé des outils — 🧱

`createEgressGuard` applique une politique par URL :

- `open` : tout hôte en `https` ;
- `allowlist` : seulement les hôtes listés. Motifs acceptés : hôte exact (`api.agence.fr`),
  sous-domaines (`*.agence.fr`, qui n'inclut pas le domaine nu), hôte et port (`agence.fr:8443`) ;
- `deny-all` : aucune sortie.

Dans tous les modes, `https` est exigé (sauf `http` vers `localhost`, `127.0.0.1`, `::1`) et les
identifiants dans l'URL (`user:pass@`) sont refusés. `createGuardedFetch` vérifie l'URL avant
l'appel, désactive le suivi automatique des redirections et refuse une redirection vers un hôte non
autorisé. Il complète la passerelle pour les outils de Jarvis (exigence de `https`), mais n'est pas
encore utilisé ; ses motifs d'hôtes sont réutilisés par la passerelle.

## Coffre de secrets — 🧱

- Les valeurs sont chiffrées au repos par `safeStorage` d'Electron, adossé au trousseau du système
  (libsecret : GNOME Keyring ou KWallet). Le coffre **refuse de s'ouvrir** si le chiffrement est
  indisponible ou si Electron retombe sur le backend `basic_text` (clé codée en dur) ou `unknown`.
- Noms de secret : `a-z`, `0-9`, `.`, `_`, `-`, 64 caractères au plus. Valeur : 6 caractères au
  moins, pour éviter les faux positifs du masquage.
- Le modèle ne manipule que des références `{{secret:nom}}`. `resolveReferences` les remplace au
  moment d'exécuter un outil, uniquement pour les noms autorisés pour cet outil. Une référence
  inconnue ou non autorisée fait échouer tout l'appel (pas de substitution partielle).
- `redact` remplace dans un texte sortant toute valeur connue, ainsi que ses formes base64 et
  URL-encodée, par `[secret:nom]`.
- `looksLikeSecret` repère ce qui ressemble à un secret (clé privée PEM, préfixes de jetons
  `ghp_`, `glpat`, `xoxb`, `sk-`, `AKIA`…, `password=…`, mot à forte entropie) pour l'interdire en
  mémoire.

**Limites connues**

- Rien n'appelle le coffre : aucun écran, aucun outil, aucun emplacement de fichier défini.
- Les identifiants des fournisseurs de modèles et des serveurs MCP restent aujourd'hui gérés par
  Pi (`~/.config/Jarvis/agent/auth.json`, `mcp.json`), hors du coffre et non chiffrés par Jarvis.
- Le masquage ne reconnaît que trois formes exactes. Il ne détecte pas une valeur encodée
  autrement (hexadécimal, base64 décalé, JSON échappé), tronquée ou découpée entre deux morceaux
  d'un flux.
- Une fois le coffre chargé, les valeurs sont en clair dans la mémoire du process main.
- L'accord de l'utilisateur à la première utilisation d'un secret par un outil (prévu par la
  spécification) n'existe pas.

## Sandbox Chromium et AppArmor — ✅

Sur Ubuntu 23.10 et suivants, AppArmor interdit les user namespaces non privilégiés. Chromium
retombe alors sur le helper SUID `chrome-sandbox`, qui ne peut pas être setuid root dans une
AppImage montée par l'utilisateur : sans précaution, l'application s'arrêterait au démarrage.

Le crochet `afterPack` renomme le binaire Electron en `jarvis.bin` et installe à sa place un script
`jarvis` qui lance `jarvis.bin` **avec la sandbox** si l'une de ces conditions est remplie :

1. les user namespaces sont disponibles
   (`/proc/sys/kernel/apparmor_restrict_unprivileged_userns` différent de `1`,
   `unprivileged_userns_clone` différent de `0`, `max_user_namespaces` différent de `0`) ;
2. `chrome-sandbox` est setuid et appartient à root (installation hors AppImage par un admin) ;
3. le profil AppArmor `/etc/apparmor.d/jarvis` est installé ;
4. ou la variable `JARVIS_FORCE_SANDBOX=1` est définie.

Sinon, il affiche un avertissement sur la sortie d'erreur et lance `jarvis.bin --no-sandbox`.

Le profil fourni ([`apparmor-jarvis`](../apps/desktop/resources/linux/apparmor-jarvis)) autorise
les user namespaces pour `/tmp/.mount_*/jarvis.bin` et `/home/*/.local/share/jarvis/app/jarvis.bin`. Son installation demande root, une fois par
poste ; voir [exploitation.md](exploitation.md).

**Limites connues**

- Le profil est `flags=(unconfined)` : il ne confine rien, il ne fait qu'autoriser `userns`.
- Son chemin est un motif dans `/tmp`, accessible en écriture à tous : n'importe quel programme
  placé dans un dossier `/tmp/.mount_<x>/jarvis.bin` obtient lui aussi le droit de créer des user
  namespaces. Le profil affaiblit donc la restriction d'Ubuntu pour ce motif de chemin.
- Le fichier `jarvis.desktop` généré par electron-builder contenait `Exec=AppRun --no-sandbox %U` :
  lancée par une intégration de bureau, l'application démarrait toujours sans sandbox. Corrigé
  (issue #12) : `executableArgs` pose à la place un marqueur neutre, `--jarvis-desktop-entry`, que
  le lanceur retire ; le lanceur décide seul de la sandbox. L'entrée de menu créée par
  `scripts/install.sh` n'a jamais contenu `--no-sandbox`.
- Sans profil ni user namespaces, l'application tourne sans sandbox Chromium : le renderer reste
  isolé par `contextIsolation`, mais une faille de Chromium n'est plus contenue.

## Daemon et autostart sans root — 🧱

[`user-daemon.ts`](../apps/desktop/electron/jarvis/user-daemon.ts) :

- `assertNotRoot` refuse un uid 0 ;
- `resolveLaunchPath` utilise `$APPIMAGE` plutôt que le montage temporaire `/tmp/.mount_*`, qui
  disparaît à la fermeture ;
- `installUserIntegration` écrit uniquement sous `$XDG_CONFIG_HOME` (ou `~/.config`) :
  `autostart/jarvis.desktop` (option `--background`), `systemd/user/jarvis-tasks.service`
  (`--daemon --run-due`, `Nice=10`) et `jarvis-tasks.timer` (2 minutes après le démarrage, puis
  toutes les 5 minutes par défaut, `Persistent=true`). Rien n'est écrit dans `/etc` ni `/usr`.
- Sans `systemd --user`, l'installation se dégrade : seul l'autostart est posé.

**Limites connues**

- Rien n'appelle ce code, et `main.ts` ne gère ni `--background` ni `--daemon --run-due` : des
  unités installées lanceraient l'application complète à chaque passage du timer.
- Le refus de root est actif au démarrage de l'application (`main.ts`, issue #11) ; le harnais
  de test l'autorise explicitement (`JARVIS_ALLOW_ROOT_FOR_TESTS=1`) pour les conteneurs root.
- Le service n'a pas de durcissement systemd (`NoNewPrivileges`, `ProtectSystem`…) : c'est un
  choix documenté dans le code, car le montage d'une AppImage passe par `fusermount` (setuid).
- Le verrou de fichier prévu pour qu'un seul exécuteur traite `scheduled-tasks.json` n'existe pas.

## OIDC et PKCS#11 — 📐

Prévus par la [spécification](specification.md#7-bis-authentification--oidc-et-pkcs11), sans code :

- **OIDC** : client public natif (RFC 8252), Authorization Code + PKCE dans le navigateur du
  système, redirection sur `127.0.0.1`, jetons validés (JWKS, `iss`, `aud`, `exp`), refresh token
  dans le coffre. Le jeton authentifierait l'application auprès du serveur de configuration, qui
  pourrait servir un bundle par groupe.
- **PKCS#11** : authentification par carte à puce soit au niveau du fournisseur d'identité
  (recommandé, aucun code natif), soit par mTLS vers le serveur de configuration avec la base NSS
  de l'utilisateur.

## Chaîne de distribution

- L'AppImage n'est pas signée. Le fichier `SHA256SUMS.txt` est publié dans la même release : il
  détecte une corruption du téléchargement, pas une substitution par quelqu'un qui contrôlerait la
  release.
- La confiance repose sur le compte GitHub `sicDANGBE` et sur les droits d'écriture du dépôt : le
  workflow publie avec le `GITHUB_TOKEN` du dépôt.
- La mise à jour Windows vérifie un manifeste et une empreinte SHA-256 publiés dans la même release
  (même limite).

## Autres points d'attention

- Les extensions Pi (projet, utilisateur, paquets) s'exécutent avec les droits de l'utilisateur.
  Jarvis s'appuie sur le mécanisme de découverte et de confiance de Pi ; il n'ajoute pas de
  liste blanche d'extensions.
- L'outil `bash` de Pi et le terminal intégré sont disponibles pour tous : le « mode non
  développeur » qui les masquerait n'est que spécifié.
- Le prompt système imposé par l'agence n'existe pas encore : l'utilisateur et les extensions
  gardent la main sur le comportement de l'agent.
