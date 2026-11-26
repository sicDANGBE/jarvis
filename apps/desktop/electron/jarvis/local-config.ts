/**
 * Configuration locale de développement (issue #3, décision D1).
 *
 * Une version de développement (non packagée, ou version de pré-release comme `1.0.6-nightly.3`)
 * lit `<userData>/jarvis-config.json` : même schéma que le bundle du serveur de l'agence, sans
 * signature, avec des dates facultatives. L'utilisateur est simulé, avec `isAdmin: true` : cela
 * préfigure les rôles qui viendront de l'authentification.
 *
 * Une version de production (version stable `X.Y.Z` packagée) ignore ce fichier : un utilisateur
 * ne peut pas contourner la politique de l'agence en déposant un fichier.
 */
import { readFileSync } from "node:fs";
import { userInfo } from "node:os";
import { join } from "node:path";

import { parseManagedConfig, type ManagedConfigBundle } from "./managed-config";
import type { NetworkPolicy } from "./network-gateway";
import { DEFAULT_NETWORK_POLICY } from "./network-gateway";

export const LOCAL_CONFIG_FILE = "jarvis-config.json";

export interface JarvisUser {
  readonly id: string;
  readonly displayName: string;
  readonly isAdmin: boolean;
  /** D'où vient l'identité : simulée en développement, authentifiée plus tard. */
  readonly source: "simulated";
}

export type LocalConfigResult =
  | { readonly status: "production" }
  | { readonly status: "absent"; readonly path: string }
  | { readonly status: "invalid"; readonly path: string; readonly error: string }
  | { readonly status: "loaded"; readonly path: string; readonly config: ManagedConfigBundle };

/** Développement : application non packagée, ou version de pré-release (contient un tiret). */
export function isDevelopmentBuild(packaged: boolean, version: string): boolean {
  return !packaged || version.includes("-");
}

export function simulatedDevUser(name: string = safeUserName()): JarvisUser {
  return { id: "dev-admin", displayName: name, isAdmin: true, source: "simulated" };
}

function safeUserName(): string {
  try {
    return userInfo().username || "Développeur";
  } catch {
    return "Développeur";
  }
}

/** Valide le contenu d'un fichier local : dates facultatives, intranet par défaut. */
export function parseLocalDevConfig(raw: unknown, now: Date = new Date()): ManagedConfigBundle {
  const record = (raw !== null && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const farFuture = new Date(now.getTime() + 10 * 365 * 24 * 3600 * 1000).toISOString();
  return parseManagedConfig({
    version: 1,
    issuedAt: now.toISOString(),
    expiresAt: farFuture,
    systemPrompt: "",
    egress: { mode: "intranet", hosts: [] },
    ...record,
  });
}

export function loadLocalDevConfig(options: {
  readonly userDataDir: string;
  readonly packaged: boolean;
  readonly version: string;
  readonly readFile?: (path: string) => string;
}): LocalConfigResult {
  if (!isDevelopmentBuild(options.packaged, options.version)) return { status: "production" };
  const path = join(options.userDataDir, LOCAL_CONFIG_FILE);
  let text: string;
  try {
    text = (options.readFile ?? ((file) => readFileSync(file, "utf8")))(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { status: "absent", path };
    return { status: "invalid", path, error: (error as Error).message };
  }
  try {
    return { status: "loaded", path, config: parseLocalDevConfig(JSON.parse(text)) };
  } catch (error) {
    return { status: "invalid", path, error: (error as Error).message };
  }
}

/** Politique réseau d'une configuration ; intranet seul tant qu'aucune n'est chargée. */
export function networkPolicyFromConfig(config: ManagedConfigBundle | undefined): NetworkPolicy {
  if (!config) return DEFAULT_NETWORK_POLICY;
  const egress = config.egress;
  switch (egress.mode) {
    case "intranet":
    case "allowlist":
      return { mode: egress.mode, hosts: egress.hosts };
    case "deny-all":
    case "open":
      return { mode: egress.mode, hosts: [] };
  }
}
