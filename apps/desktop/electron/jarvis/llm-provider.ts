/**
 * Fournisseur de modèles de l'agence (LiteLLM), déclaré par la configuration (issue #7).
 *
 * Au démarrage, avant que Pi ne lise `models.json`, Jarvis y écrit le fournisseur de la
 * configuration (adresse, modèles et leurs vraies limites), marqué `jarvisManaged` : il n'apparaît
 * pas dans les points d'accès personnalisés et l'utilisateur ne peut pas le modifier. Les autres
 * fournisseurs du fichier sont conservés. Un fournisseur géré qui n'est plus dans la configuration
 * est retiré.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ManagedLlm } from "./managed-config";

export const MANAGED_PROVIDER_MARKER = "jarvisManaged";

type ModelsFile = { providers?: Record<string, Record<string, unknown>> } & Record<string, unknown>;

function readModelsFile(path: string): ModelsFile {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ModelsFile)
      : {};
  } catch {
    return {};
  }
}

export function managedProviderEntry(llm: ManagedLlm): Record<string, unknown> {
  return {
    [MANAGED_PROVIDER_MARKER]: true,
    baseUrl: llm.baseUrl,
    api: "openai-completions",
    // Pi exige une clé ; une passerelle sans authentification ignore cette valeur.
    apiKey: llm.apiKey ?? "jarvis-no-key",
    models: llm.models.map((model) => ({
      id: model.id,
      ...(model.label ? { name: model.label } : {}),
      input: model.images ? ["text", "image"] : ["text"],
      reasoning: model.reasoning === true,
      ...(model.contextWindow ? { contextWindow: model.contextWindow } : {}),
      ...(model.maxOutputTokens ? { maxTokens: model.maxOutputTokens } : {}),
    })),
  };
}

/** Synchronise le fournisseur géré dans `<agentDir>/models.json`. Renvoie vrai si le fichier a changé. */
export function syncManagedLlmProvider(agentDir: string, llm: ManagedLlm | undefined): boolean {
  const path = join(agentDir, "models.json");
  const file = readModelsFile(path);
  const providers: Record<string, Record<string, unknown>> = { ...(file.providers ?? {}) };
  const before = JSON.stringify(providers);
  for (const [id, entry] of Object.entries(providers)) {
    if (entry[MANAGED_PROVIDER_MARKER] === true && id !== llm?.providerId) delete providers[id];
  }
  if (llm) providers[llm.providerId] = managedProviderEntry(llm);
  if (JSON.stringify(providers) === before) return false;
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ ...file, providers }, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
  return true;
}
