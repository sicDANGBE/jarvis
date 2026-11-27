import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { AGENT_DIR_ENV, setupJarvisAgentDir } from "../../electron/jarvis/agent-dir";

test.describe("dossier de l'agent propre à Jarvis", () => {
  test("crée le dossier, importe une fois la configuration de Pi, sans les sessions", async () => {
    const root = await mkdtemp(join(tmpdir(), "jarvis-agent-dir-"));
    try {
      const legacy = join(root, "pi-agent");
      await mkdir(join(legacy, "sessions"), { recursive: true });
      await writeFile(join(legacy, "settings.json"), '{"defaultModel":"m"}');
      await writeFile(join(legacy, "auth.json"), '{"p":{"type":"api_key","key":"secret-xyz"}}');
      await writeFile(join(legacy, "sessions", "s.jsonl"), "{}");
      const env: NodeJS.ProcessEnv = {};
      const userDataDir = join(root, "userData");

      const first = setupJarvisAgentDir({ userDataDir, env, legacyAgentDir: legacy });
      expect(first).toEqual({
        agentDir: join(userDataDir, "agent"),
        created: true,
        imported: ["settings.json", "auth.json"],
        fromEnvironment: false,
      });
      expect(env[AGENT_DIR_ENV]).toBe(join(userDataDir, "agent"));
      expect(await readFile(join(first.agentDir, "settings.json"), "utf8")).toContain(
        "defaultModel",
      );
      expect((await stat(join(first.agentDir, "auth.json"))).mode & 0o777).toBe(0o600);
      await expect(stat(join(first.agentDir, "sessions"))).rejects.toThrow();
      // La configuration de Pi en terminal n'est ni déplacée ni modifiée.
      expect(await readFile(join(legacy, "auth.json"), "utf8")).toContain("secret-xyz");

      // Deuxième lancement : rien n'est réimporté.
      await writeFile(join(legacy, "settings.json"), '{"defaultModel":"autre"}');
      const second = setupJarvisAgentDir({ userDataDir, env: {}, legacyAgentDir: legacy });
      expect(second.created).toBe(false);
      expect(second.imported).toEqual([]);
      expect(await readFile(join(first.agentDir, "settings.json"), "utf8")).toContain('"m"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("respecte un dossier déjà fixé par l'environnement", () => {
    const env: NodeJS.ProcessEnv = { [AGENT_DIR_ENV]: "/tmp/agent-de-test" };
    expect(setupJarvisAgentDir({ userDataDir: "/nulle/part", env })).toEqual({
      agentDir: "/tmp/agent-de-test",
      created: false,
      imported: [],
      fromEnvironment: true,
    });
  });
});
