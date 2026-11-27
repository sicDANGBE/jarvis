/**
 * Dossier de l'agent propre à Jarvis (issue #2, décision D4).
 *
 * Pi lit sa configuration (réglages, identifiants, modèles, serveurs MCP, compétences, sessions)
 * dans `PI_CODING_AGENT_DIR`, ou `~/.pi/agent` par défaut — le dossier partagé avec Pi en
 * terminal. Jarvis fixe cette variable à `<userData>/agent` au démarrage, avant de créer le
 * moindre runtime : tout le process main et ses processus enfants (sous-agents) l'utilisent.
 *
 * Au premier lancement, les fichiers de configuration de `~/.pi/agent` sont importés une fois
 * (copiés, jamais déplacés ni supprimés), pour ne pas perdre les fournisseurs déjà réglés. Les
 * sessions ne sont pas copiées : chaque discussion connue de Jarvis garde le chemin complet de
 * son fichier et reste accessible.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const AGENT_DIR_ENV = "PI_CODING_AGENT_DIR";

/** Fichiers de configuration de Pi importés au premier lancement. */
export const IMPORTED_PI_FILES = ["settings.json", "auth.json", "models.json", "mcp.json"] as const;

/** Fichiers qui peuvent contenir des secrets : lisibles par l'utilisateur seul. */
const PRIVATE_FILES = new Set<string>(["auth.json", "models.json", "mcp.json"]);

export interface AgentDirSetup {
  readonly agentDir: string;
  /** Vrai si le dossier vient d'être créé par Jarvis. */
  readonly created: boolean;
  /** Fichiers copiés depuis la configuration de Pi en terminal. */
  readonly imported: readonly string[];
  /** Vrai si le dossier vient d'une variable d'environnement déjà posée (tests, développement). */
  readonly fromEnvironment: boolean;
}

/**
 * Fixe le dossier de l'agent de Jarvis et importe, la première fois, la configuration de Pi.
 * Respecte une valeur déjà présente dans l'environnement (tests, développement).
 */
export function setupJarvisAgentDir(options: {
  readonly userDataDir: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly legacyAgentDir?: string;
}): AgentDirSetup {
  const env = options.env ?? process.env;
  const existing = env[AGENT_DIR_ENV]?.trim();
  if (existing) {
    return { agentDir: existing, created: false, imported: [], fromEnvironment: true };
  }
  const agentDir = join(options.userDataDir, "agent");
  env[AGENT_DIR_ENV] = agentDir;
  if (existsSync(agentDir)) {
    return { agentDir, created: false, imported: [], fromEnvironment: false };
  }
  mkdirSync(agentDir, { recursive: true, mode: 0o700 });
  const legacy = options.legacyAgentDir ?? join(homedir(), ".pi", "agent");
  const imported: string[] = [];
  for (const file of IMPORTED_PI_FILES) {
    const source = join(legacy, file);
    try {
      if (!statSync(source).isFile()) continue;
      const target = join(agentDir, file);
      copyFileSync(source, target);
      if (PRIVATE_FILES.has(file)) chmodSync(target, 0o600);
      imported.push(file);
    } catch {
      // Fichier absent ou illisible : rien à importer.
    }
  }
  return { agentDir, created: true, imported, fromEnvironment: false };
}
