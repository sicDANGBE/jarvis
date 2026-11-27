/**
 * Modèles autorisés par la configuration de l'agence (issue #4).
 *
 * Motifs acceptés dans `models.allowed` : `fournisseur:modèle`, ou `fournisseur/modèle` (forme de
 * la spécification ; le premier `/` sépare alors le fournisseur). Un `*` final sert de joker :
 * `litellm:*`, `litellm:mistral-*`. Sans liste, tous les modèles sont autorisés.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ModelAllowed = (provider: string, modelId: string) => boolean;

interface ModelRule {
  readonly provider: string;
  readonly model: string;
}

export function parseModelRef(value: string): ModelRule | undefined {
  const trimmed = value.trim();
  const separator = trimmed.includes(":") ? ":" : "/";
  const index = trimmed.indexOf(separator);
  if (index <= 0 || index === trimmed.length - 1) return undefined;
  return { provider: trimmed.slice(0, index), model: trimmed.slice(index + 1) };
}

function matches(pattern: string, value: string): boolean {
  return pattern.endsWith("*") ? value.startsWith(pattern.slice(0, -1)) : pattern === value;
}

export function createModelAllowList(patterns: readonly string[] | undefined): ModelAllowed {
  if (!patterns) return () => true;
  const rules = patterns.map(parseModelRef).filter((rule) => rule !== undefined);
  return (provider, modelId) =>
    rules.some((rule) => matches(rule.provider, provider) && matches(rule.model, modelId));
}

/**
 * Applique le modèle par défaut de la configuration dans le `settings.json` de l'agent quand le
 * défaut actuel est absent ou n'est pas autorisé. Synchrone : appelé au démarrage, avant que Pi ne
 * lise ce fichier. Renvoie vrai si le fichier a changé.
 */
export function applyDefaultModel(options: {
  readonly agentDir: string;
  readonly defaultModel: string | undefined;
  readonly isAllowed: ModelAllowed;
}): boolean {
  const target = options.defaultModel ? parseModelRef(options.defaultModel) : undefined;
  if (!target) return false;
  const path = join(options.agentDir, "settings.json");
  let settings: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      settings = parsed as Record<string, unknown>;
    }
  } catch {
    // Fichier absent ou illisible : il sera créé avec le défaut de l'agence.
  }
  const provider = settings.defaultProvider;
  const model = settings.defaultModel;
  if (
    typeof provider === "string" &&
    typeof model === "string" &&
    options.isAllowed(provider, model)
  ) {
    return false;
  }
  const next = { ...settings, defaultProvider: target.provider, defaultModel: target.model };
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
  return true;
}
