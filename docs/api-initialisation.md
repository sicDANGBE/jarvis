# API d'initialisation — proposition

> **Statut : proposition à valider ensemble** (issue [#6](https://github.com/sicDANGBE/jarvis/issues/6),
> décision [D4](decisions.md#d4--configuration-propre-à-jarvis-et-initialisation)). Rien n'est
> implémenté côté client ni côté serveur. Ce document rassemble ce que les décisions D1 à D20
> attendent du serveur de paramètres, pour que client et serveur avancent séparément.

## Principe

1. Le client s'installe ; l'**adresse du serveur** figure dans sa configuration initiale.
2. Au démarrage (puis périodiquement), le client appelle **`POST /api/v1/init`**.
3. Le serveur répond avec tout ce dont le harness a besoin : configuration, réglages administrés,
   modèles, outils, profils, points d'accès, mises à jour.
4. La réponse est **signée** (Ed25519, même enveloppe que le bundle actuel,
   [exploitation.md](exploitation.md#configuration-centrale-signée)) et mise en cache ; une réponse
   invalide n'écrase jamais la dernière valide, une réponse plus ancienne est refusée.

Le serveur est sur l'intranet : l'appel passe par la passerelle réseau et apparaît dans les
notifications d'accès réseau.

## Authentification

- `Authorization: Bearer <jeton d'accès OIDC>` émis par le Keycloak de l'utilisateur
  ([D6](decisions.md#d6--authentification)).
- En plus, les en-têtes imposés par la configuration (D6), et le certificat client si mTLS
  (PKCS#11).
- En développement : pas de jeton ; utilisateur simulé `isAdmin: true`
  ([D1](decisions.md#d1--source-de-la-configuration)).

## Requête

```json
{
  "client": {
    "version": "1.0.6-nightly.6",
    "channel": "nightly",
    "platform": "linux",
    "arch": "x64"
  },
  "cache": {
    "sequence": 41,
    "etag": "W/\"bundle-41\""
  }
}
```

`cache` permet au serveur de répondre `304 Not Modified` si rien n'a changé.

## Réponse

Enveloppe signée :

```json
{ "payload": "<JSON ci-dessous encodé en base64>", "signature": "<Ed25519 en base64>" }
```

Contenu (`payload`) :

```json
{
  "version": 2,
  "sequence": 42,
  "issuedAt": "2026-11-27T08:00:00Z",
  "expiresAt": "2026-11-28T08:00:00Z",
  "refreshAfterSeconds": 3600,

  "user": {
    "id": "c0ffee-…",
    "displayName": "Roméo",
    "roles": ["jarvis-user", "jarvis-admin"],
    "plan": "Standard"
  },

  "systemPrompt": "Tu es l'assistant de l'agence…",

  "settings": {
    "network.internet": { "value": false, "default": false, "locked": true },
    "network.hosts": { "value": ["llm.agence.fr", "*.agence.fr"], "locked": true },
    "traces.internet.upload": { "value": true, "locked": true },
    "ui.language": { "default": "fr", "locked": false },
    "voice.enabled": { "default": true, "locked": false }
  },

  "llm": {
    "gateway": "litellm",
    "baseUrl": "https://llm.agence.fr/v1",
    "models": [
      {
        "id": "mistral-large",
        "label": "Mistral Large",
        "contextWindow": 131072,
        "maxOutputTokens": 16384,
        "reasoning": false,
        "images": true
      }
    ],
    "defaultModel": "mistral-large",
    "quota": { "period": "month", "limit": 2000000, "used": 120000, "unit": "tokens" }
  },

  "tools": {
    "allowed": ["read", "edit", "write", "browser", "drawio", "office", "mail"],
    "suggested": ["jira"]
  },
  "mcpServers": [
    { "id": "kb", "label": "Base documentaire", "url": "https://kb.agence.fr/mcp", "locked": true }
  ],
  "packages": ["npm:@agence/pi-plugins"],
  "knowledge": [{ "id": "procedures", "url": "https://kb.agence.fr/procedures.zip" }],

  "profiles": [
    {
      "id": "general",
      "label": "Généraliste",
      "default": true,
      "tools": ["read", "browser", "office", "mail"]
    },
    {
      "id": "dev",
      "label": "Expert développement",
      "roles": ["jarvis-dev"],
      "tools": ["read", "edit", "write", "bash", "terminal"],
      "developerMode": true
    }
  ],

  "endpoints": {
    "transcription": { "url": "https://stt.agence.fr/v1/audio/transcriptions", "model": "whisper" },
    "speech": { "url": "https://tts.agence.fr/v1/audio/speech" },
    "ocr": { "url": "https://ocr.agence.fr/v1/ocr" },
    "traces": { "url": "https://traces.agence.fr/v1/batch" },
    "mail": {
      "imap": "imaps://mail.agence.fr:993",
      "smtp": "smtps://mail.agence.fr:465",
      "caldav": "https://agenda.agence.fr/dav/",
      "carddav": "https://agenda.agence.fr/dav/"
    }
  },

  "updates": {
    "latest": "1.1.0",
    "forced": false,
    "url": "https://jarvis.agence.fr/releases/1.1.0/jarvis-1.1.0-x86_64.AppImage",
    "sha256": "…",
    "signature": "…",
    "notes": "Nouveautés de la version 1.1.0…"
  }
}
```

### Sens des blocs

| Bloc                                           | Décision      | Utilisation côté client                                                          |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `sequence`                                     | D1            | Refus d'une réponse plus ancienne que le cache.                                  |
| `user`                                         | D6, D15       | Bloc utilisateur, rôles, ciblage des réglages ; `plan` affiché à côté du prénom. |
| `settings`                                     | D15           | Triplets valeur / défaut / verrouillé, résolus avant les choix de l'utilisateur. |
| `llm`                                          | D6, #7        | Fournisseur LiteLLM, limites réelles des modèles, quota d'usage.                 |
| `tools`, `mcpServers`, `packages`, `knowledge` | D13           | Outils validés et proposés, catalogue.                                           |
| `profiles`                                     | D17           | Profils d'agent, filtrés par rôle.                                               |
| `endpoints`                                    | D16, D18, D20 | Voix, OCR, traces, messagerie et agenda.                                         |
| `updates`                                      | D7            | Mise à jour, marqueur `forced`, signature.                                       |

## Codes de réponse

| Code          | Sens                     | Comportement du client                                           |
| ------------- | ------------------------ | ---------------------------------------------------------------- |
| `200`         | Nouvelle configuration   | Vérifier la signature et `sequence`, appliquer, mettre en cache. |
| `304`         | Inchangée                | Garder le cache.                                                 |
| `401`         | Jeton absent ou expiré   | Relancer l'authentification OIDC.                                |
| `403`         | Utilisateur non autorisé | Écran bloquant explicite.                                        |
| `5xx`, réseau | Serveur indisponible     | Cache valide : continuer ; cache expiré : mode dégradé (D16).    |

## Rafraîchissement et hors ligne

- Nouvel appel après `refreshAfterSeconds`, au retour de veille et à la reconnexion réseau.
- Hors ligne, le cache reste valable jusqu'à `expiresAt`. Au-delà : le harness ne fonctionne qu'avec
  un point d'accès local (poste ou intranet, D16) et l'indique à l'utilisateur.

## Questions ouvertes

- Une seule route `init` ou plusieurs routes (configuration, mises à jour, traces) ?
- Le serveur filtre-t-il lui-même par rôle (réponse propre à l'utilisateur), ou le client filtre-t-il ?
- Liste définitive des clés de `settings` pour la première version.
- Format du lot de traces envoyé à `endpoints.traces`.
