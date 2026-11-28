/**
 * Configuration centralisée signée, fournie par le serveur de l'agence.
 *
 * Format sur le fil : { "payload": "<JSON du bundle encodé en base64>", "signature": "<Ed25519 base64>" }
 * La signature porte sur les octets exacts du payload décodé.
 * Règle de sûreté : un bundle invalide, mal signé ou expiré n'écrase jamais le dernier bundle valide.
 */
import { parseAgencySettings, type AgencySettings } from "./managed-settings";
import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";

import { writeFileAtomicQueued } from "../persistence/atomic-file-write";
import type { EgressPolicy } from "./egress-guard";

export const MANAGED_CONFIG_VERSION = 1;

export interface KnowledgeSource {
  readonly id: string;
  readonly url: string;
}

export interface ManagedConfigBundle {
  readonly version: typeof MANAGED_CONFIG_VERSION;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly systemPrompt: string;
  readonly egress: EgressPolicy;
  readonly models?: { readonly allowed: readonly string[]; readonly default?: string };
  readonly packages: readonly string[];
  readonly knowledge: readonly KnowledgeSource[];
  readonly features: { readonly developerMode: boolean };
  /** Passerelle de modèles de l'agence (LiteLLM), compatible OpenAI (issue #7). */
  readonly llm?: ManagedLlm;
  /** Réglages administrés : valeur, défaut, verrouillage (issue #41). */
  readonly settings?: AgencySettings;
  /** Serveur de traces des requêtes Internet (issue #42). */
  readonly traces?: { readonly url: string };
}

export interface ManagedLlmModel {
  readonly id: string;
  readonly label?: string;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly reasoning?: boolean;
  readonly images?: boolean;
}

export interface ManagedLlm {
  /** Identifiant du fournisseur dans Jarvis, `agence` par défaut. */
  readonly providerId: string;
  readonly baseUrl: string;
  /** Clé d'API ou référence `$VARIABLE` (jamais de secret en clair dans le dépôt). */
  readonly apiKey?: string;
  readonly models: readonly ManagedLlmModel[];
}

export interface SignedEnvelope {
  readonly payload: string;
  readonly signature: string;
}

const MAX_PROMPT_LENGTH = 64_000;

function fail(message: string): never {
  throw new Error(`Configuration agence invalide : ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    fail(`${field} doit être une liste de chaînes`);
  }
  return value as string[];
}

function isoDate(value: unknown, field: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    fail(`${field} doit être une date ISO`);
  }
  return value;
}

function parseEgress(value: unknown): EgressPolicy {
  if (!isRecord(value)) fail("egress manquant");
  switch (value.mode) {
    case "open":
      return { mode: "open" };
    case "deny-all":
      return { mode: "deny-all" };
    case "allowlist":
      return { mode: "allowlist", hosts: stringArray(value.hosts, "egress.hosts") };
    case "intranet":
      return { mode: "intranet", hosts: stringArray(value.hosts ?? [], "egress.hosts") };
    default:
      return fail("egress.mode doit valoir intranet, allowlist, deny-all ou open");
  }
}

function positiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    fail(`${field} doit être un entier positif`);
  }
  return value;
}

function parseLlm(value: unknown): ManagedLlm {
  if (!isRecord(value)) fail("llm doit être un objet");
  if (typeof value.baseUrl !== "string" || !/^https?:\/\//.test(value.baseUrl)) {
    fail("llm.baseUrl doit être une URL http(s)");
  }
  const providerId = value.providerId ?? "agence";
  if (typeof providerId !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(providerId)) {
    fail("llm.providerId : minuscules, chiffres et tirets");
  }
  if (value.apiKey !== undefined && typeof value.apiKey !== "string") {
    fail("llm.apiKey doit être une chaîne");
  }
  if (!Array.isArray(value.models) || value.models.length === 0) {
    fail("llm.models doit lister au moins un modèle");
  }
  const models = value.models.map((entry: unknown, index): ManagedLlmModel => {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.length === 0) {
      fail(`llm.models[${index}].id manquant`);
    }
    const contextWindow = positiveInteger(
      entry.contextWindow,
      `llm.models[${index}].contextWindow`,
    );
    const maxOutputTokens = positiveInteger(
      entry.maxOutputTokens,
      `llm.models[${index}].maxOutputTokens`,
    );
    return {
      id: entry.id,
      ...(typeof entry.label === "string" ? { label: entry.label } : {}),
      ...(contextWindow ? { contextWindow } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      ...(entry.reasoning === true ? { reasoning: true } : {}),
      ...(entry.images === true ? { images: true } : {}),
    };
  });
  return {
    providerId,
    baseUrl: value.baseUrl,
    ...(typeof value.apiKey === "string" ? { apiKey: value.apiKey } : {}),
    models,
  };
}

export function parseManagedConfig(raw: unknown): ManagedConfigBundle {
  if (!isRecord(raw)) fail("objet attendu");
  if (raw.version !== MANAGED_CONFIG_VERSION) fail(`version ${String(raw.version)} non supportée`);
  if (typeof raw.systemPrompt !== "string" || raw.systemPrompt.length > MAX_PROMPT_LENGTH) {
    fail("systemPrompt manquant ou trop long");
  }
  const knowledgeRaw = raw.knowledge ?? [];
  if (!Array.isArray(knowledgeRaw)) fail("knowledge doit être une liste");
  const knowledge = knowledgeRaw.map((entry: unknown, index): KnowledgeSource => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.url !== "string") {
      fail(`knowledge[${index}] doit contenir id et url`);
    }
    if (!entry.url.startsWith("https://")) fail(`knowledge[${index}].url doit être en https`);
    return { id: entry.id, url: entry.url };
  });
  let models: ManagedConfigBundle["models"];
  if (raw.models !== undefined) {
    if (!isRecord(raw.models)) fail("models doit être un objet");
    const allowed = stringArray(raw.models.allowed, "models.allowed");
    const def = raw.models.default;
    if (def !== undefined && (typeof def !== "string" || !allowed.includes(def))) {
      fail("models.default doit figurer dans models.allowed");
    }
    models = def === undefined ? { allowed } : { allowed, default: def };
  }
  const features = isRecord(raw.features) ? raw.features : {};
  const bundle: ManagedConfigBundle = {
    version: MANAGED_CONFIG_VERSION,
    issuedAt: isoDate(raw.issuedAt, "issuedAt"),
    expiresAt: isoDate(raw.expiresAt, "expiresAt"),
    systemPrompt: raw.systemPrompt,
    egress: parseEgress(raw.egress),
    packages: stringArray(raw.packages ?? [], "packages"),
    knowledge,
    features: { developerMode: features.developerMode === true },
  };
  const llm = raw.llm === undefined ? undefined : parseLlm(raw.llm);
  let settings: AgencySettings | undefined;
  try {
    settings = raw.settings === undefined ? undefined : parseAgencySettings(raw.settings);
  } catch (error) {
    fail((error as Error).message);
  }
  let traces: ManagedConfigBundle["traces"];
  if (raw.traces !== undefined) {
    if (!isRecord(raw.traces) || typeof raw.traces.url !== "string") fail("traces.url manquant");
    if (!/^https?:\/\//.test(raw.traces.url)) fail("traces.url doit être une URL http(s)");
    traces = { url: raw.traces.url };
  }
  return {
    ...bundle,
    ...(traces ? { traces } : {}),
    ...(models ? { models } : {}),
    ...(llm ? { llm } : {}),
    ...(settings ? { settings } : {}),
  };
}

/** Vérifie la signature Ed25519 puis valide le contenu. Lève une erreur au moindre doute. */
export function openSignedConfig(
  envelope: unknown,
  publicKeyPem: string,
  now: Date = new Date(),
): ManagedConfigBundle {
  if (
    !isRecord(envelope) ||
    typeof envelope.payload !== "string" ||
    typeof envelope.signature !== "string"
  ) {
    fail("enveloppe signée attendue { payload, signature }");
  }
  const payload = Buffer.from(envelope.payload, "base64");
  const signature = Buffer.from(envelope.signature, "base64");
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") fail("la clé publique doit être Ed25519");
  if (!verify(null, payload, key, signature)) fail("signature incorrecte");

  let json: unknown;
  try {
    json = JSON.parse(payload.toString("utf8"));
  } catch {
    fail("payload JSON illisible");
  }
  const bundle = parseManagedConfig(json);
  if (Date.parse(bundle.expiresAt) <= now.getTime()) fail("bundle expiré");
  if (Date.parse(bundle.issuedAt) > now.getTime() + 5 * 60_000) fail("bundle daté du futur");
  return bundle;
}

export interface ManagedConfigSourceOptions {
  readonly url: string;
  readonly publicKeyPem: string;
  /** Fichier où l'enveloppe validée est mise en cache (userData). */
  readonly cachePath: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

export type ManagedConfigResult =
  | {
      readonly source: "server" | "cache";
      readonly bundle: ManagedConfigBundle;
      readonly warning?: string;
    }
  | { readonly source: "none"; readonly error: string };

/** Le bundle en cache s'il est lisible et valide (signature, dates) ; undefined sinon. */
async function readCachedBundle(
  cachePath: string,
  publicKeyPem: string,
  now: Date,
): Promise<ManagedConfigBundle | undefined> {
  try {
    return openSignedConfig(JSON.parse(await readFile(cachePath, "utf8")), publicKeyPem, now);
  } catch {
    return undefined;
  }
}

/** Récupère le bundle ; en cas d'échec, retombe sur le dernier bundle valide en cache. */
export async function loadManagedConfig(
  options: ManagedConfigSourceOptions,
): Promise<ManagedConfigResult> {
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? fetch;
  let serverError: string;
  try {
    if (!options.url.startsWith("https://")) fail("l'URL du serveur doit être en https");
    const response = await fetchImpl(options.url, { headers: { accept: "application/json" } });
    if (!response.ok) fail(`HTTP ${response.status}`);
    const envelope: unknown = await response.json();
    const bundle = openSignedConfig(envelope, options.publicKeyPem, now());
    // Anti-retour arrière (issue #5) : un bundle valide mais plus ancien que celui en cache est
    // refusé, sinon un tiers pourrait rejouer une ancienne configuration plus permissive.
    const cached = await readCachedBundle(options.cachePath, options.publicKeyPem, now());
    if (cached && Date.parse(bundle.issuedAt) < Date.parse(cached.issuedAt)) {
      fail(
        `bundle émis le ${bundle.issuedAt}, plus ancien que celui en cache (${cached.issuedAt}) : retour arrière refusé`,
      );
    }
    await writeFileAtomicQueued(options.cachePath, JSON.stringify(envelope), (value) => value);
    return { source: "server", bundle };
  } catch (error) {
    serverError = error instanceof Error ? error.message : String(error);
  }
  try {
    const cached: unknown = JSON.parse(await readFile(options.cachePath, "utf8"));
    const bundle = openSignedConfig(cached, options.publicKeyPem, now());
    return { source: "cache", bundle, warning: serverError };
  } catch (error) {
    const cacheError = error instanceof Error ? error.message : String(error);
    return { source: "none", error: `${serverError} ; cache : ${cacheError}` };
  }
}
