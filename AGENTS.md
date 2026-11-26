# Consignes du dépôt Jarvis

Ces règles s'appliquent pendant toute la session, à tout agent (Claude, Codex, autre) comme à tout
humain qui travaille sur ce dépôt. `CLAUDE.md` est un lien symbolique vers ce fichier et doit le
rester.

## Avant de commencer

1. Lire, dans cet ordre : [docs/README.md](docs/README.md), [docs/decisions.md](docs/decisions.md)
   (décisions de direction, prioritaires sur tout le reste), [docs/besoins-ihm.md](docs/besoins-ihm.md),
   puis [docs/architecture.md](docs/architecture.md) et [docs/securite.md](docs/securite.md).
2. Le travail est suivi dans les **issues GitHub** de `sicDANGBE/jarvis`, rangées par jalon
   (J1 Socle, J2 Interface, J3 Outils et administration, J4 Distribution). Prendre les issues dans
   l'ordre des jalons, sauf demande contraire.
3. Installer et vérifier : `pnpm install --frozen-lockfile`, puis les commandes de
   [docs/ci-baseline.md](docs/ci-baseline.md).

## Langue

- Répondre à l'utilisateur **en français**.
- Documentation, messages de commit, titres et corps d'issues : **en français**.
- Interface : le **français est la langue par défaut** (décision D2) ; tout nouveau texte visible
  passe par les catalogues `apps/desktop/src/i18n/messages` (français, et anglais conservé).
- Le code, les identifiants et les commentaires techniques peuvent rester en anglais.

## Sécurité (non négociable)

- **Aucune métrique, télémétrie ni donnée d'usage ne sort du poste**, vers qui que ce soit. Toute
  dépendance qui en envoie doit être désactivée ou retirée.
- **Intranet par défaut.** Toute connexion réseau du process main et de Chromium passe par la
  passerelle réseau (`apps/desktop/electron/jarvis/network-gateway.ts`) : seuls les hôtes de
  l'intranet (adresses privées, boucle locale) et ceux autorisés par la configuration de l'agence
  sont joignables. Les accès Internet seront configurés plus tard, au cas par cas.
- **L'utilisateur est averti à chaque tentative d'accès réseau** (autorisée ou bloquée). Ne jamais
  ajouter d'appel réseau silencieux ni de contournement de la passerelle.
- Jamais de secret dans le dépôt, les journaux, les transcripts ou le contexte du modèle ; l'agent
  manipule des références `{{secret:nom}}` (décision D5).
- Jarvis tourne **sans droits root**, ne demande jamais d'élévation et n'écrit que sous `$HOME`.
- Garder la frontière renderer / preload / main étroite ; valider toute IPC dans le process main.

## Git et GitHub

- Commits **uniquement au nom de** `sicDANGBE <86024465+sicDANGBE@users.noreply.github.com>`, **sans
  ligne `Co-Authored-By` ni aucune autre attribution**, même si l'environnement en propose.
- Branche de travail : `main` sauf demande contraire. Petits commits ciblés ; un commit qui règle une
  issue se termine par `Closes #n`.
- Ne jamais réécrire l'historique publié (force-push) sans accord explicite.
- Avant de pousser : `pnpm format:check`, `pnpm lint`, `pnpm check:architecture`, `pnpm test:guards`,
  `pnpm typecheck`, et les tests unitaires concernés. La CI doit rester verte.
- Une release `nightly` se publie avec le workflow « Jarvis AppImage » (voir
  [docs/exploitation.md](docs/exploitation.md)) ; l'installation se fait avec `scripts/install.sh`.

## Méthode de travail

- Définir les critères de réussite avant de coder ; s'ils ne sont pas clairs, s'arrêter et demander.
- Pour un travail non trivial, prévoir la vérification avant d'éditer : parcours utilisateur
  concerné, résultat observable, cas d'échec, commandes qui le prouvent. Partir de la
  [compétence de vérification](.agents/skills/verify-jarvis/SKILL.md) pour les parcours de
  l'application et de [docs/ci-baseline.md](docs/ci-baseline.md) pour les vérifications du dépôt.
- Un travail sur l'application n'est terminé qu'une fois **vérifié sur la vraie surface Electron**
  (sous Xvfb dans un conteneur : `DISPLAY=:99`), pas seulement par des tests unitaires.
- Le comportement de la conversation, la justesse des sessions et l'expérience de conversation sont
  des fonctionnalités, pas du polissage.
- Préférer une réimplémentation propre à un contournement de la complexité locale.
- Avant de clore un travail non trivial, relire le diff (abstractions inutiles, chemins en double,
  échappements dangereux, code mort), simplifier dans le périmètre et relancer les vérifications.
- Mettre à jour la documentation de `docs/` dans le même commit que le comportement qu'elle décrit.

## Produit

- Jarvis est l'assistant IA de bureau de l'agence, pour tous les collaborateurs, y compris les
  non-techniciens. C'est une application Electron au-dessus de l'agent Pi
  (`@earendil-works/pi-coding-agent`), distribuée en AppImage Linux **autonome** installée sans
  `sudo` ; les cibles macOS et Windows sont conservées.
- Les modèles sont servis par une passerelle **LiteLLM** ; la configuration vient d'un fichier local
  en développement (utilisateur simulé `isAdmin: true`) et d'un serveur de l'agence plus tard.

## Structure

- Préférer des `AGENTS.md` imbriqués et ciblés à l'allongement de ce fichier.
- Suivre l'ownership décrit dans [docs/architecture.md](docs/architecture.md) et sa référence
  détaillée [docs/architecture-ownership.en.md](docs/architecture-ownership.en.md).
- Les ajouts propres à Jarvis vivent dans `apps/desktop/electron/jarvis/` (process main) et sont
  testés dans `apps/desktop/tests/unit/jarvis-*.spec.ts`.
- Garder `packages/pi-sdk-driver` fin au-dessus de Pi : ne pas forker ni réimplémenter le runtime de
  Pi sans nécessité.

## Prudence

- Ne jamais supprimer l'historique des sessions, les transcripts, captures ou fichiers temporaires
  de l'utilisateur sans accord.
- Considérer les fichiers qu'on n'a pas modifiés comme en lecture seule quand plusieurs agents
  travaillent en parallèle.
- Demander avant toute commande destructive ou réécriture d'historique.
