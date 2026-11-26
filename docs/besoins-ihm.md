# Besoins d'interface et d'outils

Besoins exprimés le 2026-11-26, à partir de l'usage réel de l'application. Pour chacun : le
besoin, ce qui existe aujourd'hui dans le code, et une piste de réalisation. Chaque section est
prévue pour devenir une ou plusieurs issues. Les décisions de fond associées sont dans
[decisions.md](decisions.md).

| N°                                                 | Besoin                                                              | Existant                      |
| -------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- |
| [B1](#b1--copier-un-bloc-de-code)                  | Copier un bloc de code                                              | Partiel (lignes d'outils)     |
| [B2](#b2--exécuter-une-commande-proposée)          | Exécuter une commande proposée et en analyser le retour             | Non                           |
| [B3](#b3--repères-de-navigation-et-statistiques)   | Repères de navigation à droite, statistiques au survol              | Non                           |
| [B4](#b4--barre-latérale--utilisateur-et-réglages) | Réglages en bas, prénom et forfait de l'utilisateur                 | Non                           |
| [B5](#b5--barre-sous-le-champ-de-saisie)           | Modèle, raisonnement et contexte sous le champ de saisie            | Partiel                       |
| [B6](#b6--touches-entrée)                          | Entrée principale envoie, Entrée du pavé numérique ajoute une ligne | Non                           |
| [B7](#b7--réinterroger-lia-sur-une-sélection)      | Réinterroger l'IA sur une sélection                                 | Partiel (« ajouter au chat ») |
| [B8](#b8--organisation-de-la-barre-latérale)       | Tri par projet ou par date                                          | Non                           |
| [B9](#b9--navigateur-drawio-et-suite-bureautique)  | Navigateur, draw.io, suite bureautique                              | Non                           |
| [B10](#b10--textes-de-linterface)                  | Textes « Ask pi… » à remplacer                                      | —                             |

## B1 — Copier un bloc de code

**Besoin.** Un bouton pour copier un bloc de code d'une réponse, sans avoir à le sélectionner.

**Existant.** Un bouton « Copy » existe sur les lignes d'appels d'outils
([`timeline-item.tsx`](../apps/desktop/src/features/conversation/timeline-item.tsx)), mais pas sur
les blocs de code rendus dans les réponses
([`message-markdown.tsx`](../apps/desktop/src/features/conversation/message-markdown.tsx)).

**Piste.** Bouton « Copier » sur chaque bloc de code, visible au survol et au clavier ; retour
visuel « Copié ». Prévoir aussi « Copier la réponse » au niveau du message.

## B2 — Exécuter une commande proposée

**Besoin.** Quand une réponse propose une commande à lancer sur le poste de l'utilisateur, pouvoir
l'**exécuter directement** depuis le bloc, et que l'agent **analyse le code retour** et la sortie.

**Existant.** Rien depuis les blocs de code. L'outil `bash` de Pi exécute des commandes à
l'initiative de l'agent, et le terminal intégré existe dans le panneau latéral.

**Piste.** Bouton « Exécuter » sur les blocs `bash`/`sh`, avec confirmation qui affiche la commande
et le dossier d'exécution. La commande tourne dans le terminal intégré (sortie visible) ; le code
retour et la sortie (tronquée) sont renvoyés à l'agent comme un message, qui les analyse.

**Points d'attention.** Confirmation obligatoire ; traçabilité ([D12](decisions.md#d12--traçabilité-des-actions)) ;
aucune substitution de secret sans autorisation ([D5](decisions.md#d5--coffre-fort-de-secrets)) ;
lien avec le mode développeur ([D3](decisions.md#d3--mode-développeur)) à trancher.

## B3 — Repères de navigation et statistiques

**Besoin.** Comme ChatGPT, de **petits traits à droite** de la conversation pour remonter
rapidement à un message. Au **survol**, afficher les **statistiques** du tour.

**Existant.** Recherche dans le fil ; jauge de contexte et d'usage pour la session entière. Pas de
repères ni de statistiques par tour.

**Piste.** Une marque par message de l'utilisateur, positionnée selon sa place dans le fil ; au
survol, un aperçu du message et ses statistiques (modèle, durée, tokens en entrée et en sortie,
cache, coût) ; clic pour y aller.

**À préciser.** La liste exacte des statistiques à afficher.

## B4 — Barre latérale : utilisateur et réglages

**Besoin.** Comme Claude : les **réglages et autres accès en bas** de la barre latérale, avec le
**prénom de l'utilisateur**. À droite du prénom, le **forfait ou quota d'usage** (« fair use »)
s'il est fourni ; ce quota est aussi rappelé sous le champ de saisie.

**Existant.** « Settings » est dans la navigation en haut de la barre latérale ; aucune identité
d'utilisateur n'est connue de l'application.

**Piste.** Un bloc utilisateur en bas de la barre latérale (avatar, prénom, forfait) qui ouvre un
menu : réglages, coffre-fort, aide, déconnexion. Le prénom et le quota viennent de l'identité
([D6](decisions.md#d6--authentification)) et de la réponse d'initialisation
([D4](decisions.md#d4--configuration-propre-à-jarvis-et-initialisation)), le quota sans doute de
LiteLLM.

## B5 — Barre sous le champ de saisie

**Besoin.** Comme Claude : le **modèle**, le **niveau de raisonnement** et la **fenêtre de
contexte** affichés **sous** le champ de saisie, avec le rappel du quota (B4).

**Existant.** Le sélecteur de modèle, le niveau de raisonnement et la jauge de contexte sont déjà
dans le compositeur ([`composer-panel.tsx`](../apps/desktop/src/features/conversation/composer-panel.tsx),
[`context-meter.tsx`](../apps/desktop/src/features/conversation/context-meter.tsx)).

**Piste.** Réorganiser le compositeur : champ de saisie, puis une barre d'état dessous avec
modèle, raisonnement, contexte et quota.

## B6 — Touches Entrée

**Besoin.** La touche **Entrée principale** envoie le message ; la touche **Entrée du pavé
numérique** ajoute une nouvelle ligne, comme `Maj+Entrée`.

**Existant.** `Entrée` envoie, `Maj+Entrée` ajoute une ligne
([`use-session-composer.tsx`](../apps/desktop/src/features/conversation/hooks/use-session-composer.tsx)).
Les deux touches Entrée ont la même valeur `event.key` et se comportent donc de la même façon.

**Piste.** Distinguer `event.code === "NumpadEnter"`. `Maj+Entrée` reste disponible pour les
claviers sans pavé numérique (portables).

## B7 — Réinterroger l'IA sur une sélection

**Besoin.** Sélectionner tout ou partie du contexte (une notion dans un compte rendu) et
interroger l'IA dessus, soit dans la conversation, soit dans une **conversation annexe** traitée
en parallèle ([D11](decisions.md#d11--conversations-annexes)).

**Existant.** La sélection d'un passage peut déjà être ajoutée au message en cours
(« ajouter au chat », `Ctrl+L`,
[`annotations/`](../apps/desktop/src/features/conversation/annotations)). Les fils enfants existent,
mais seul l'agent peut les créer.

**Piste.** Au-dessus d'une sélection, deux actions : « Ajouter à la question » (existant) et
« Demander à côté » (ouvre une conversation annexe). Dans la conversation annexe, un bouton
« Réintégrer dans la conversation principale ».

## B8 — Organisation de la barre latérale

**Besoin.** Trier les discussions **par projet** ou **par date**, au choix de l'utilisateur, selon
le modèle projet → espace de travail → discussion ([D10](decisions.md#d10--projets-espaces-de-travail-et-discussions)).

**Existant.** Fils groupés par dossier, avec épinglés et récents.

**Piste.** Sélecteur de tri en tête de liste ; vue « par projet » arborescente ; vue « par date »
groupée (aujourd'hui, 7 derniers jours, plus ancien).

## B9 — Navigateur, draw.io et suite bureautique

**Besoin.** Un **navigateur intégré**, **draw.io**, une **suite bureautique** (traitement de
texte, tableur, présentation) basée sur LibreOffice/OpenOffice, avec la possibilité pour
l'utilisateur de **fournir sa propre suite**.

**Existant.** Aucun. Le panneau latéral accueille déjà des outils (fichiers, terminal, revue,
vues d'extension) : c'est l'emplacement naturel.

**Piste.** Voir [D14](decisions.md#d14--outils-bureautiques-et-navigateur). Chaque outil peut être un
onglet du panneau latéral et un outil donné à l'agent (créer un document, ouvrir une page, produire
un diagramme).

## B10 — Textes de l'interface

**Besoin.** Le champ de saisie affiche « Ask pi to inspect the repo, run a fix, or continue the
current thread… », « Ask pi anything… » sur un nouveau fil, et « Ask pi to schedule tasks… » sur
l'écran des tâches. Ces textes s'adressent à des développeurs et nomment Pi.

**Piste.** Les remplacer dans le catalogue français ([D2](decisions.md#d2--langue)), par exemple
« Demandez à Jarvis… ». Le test de garde des textes du renderer doit couvrir ces champs.
