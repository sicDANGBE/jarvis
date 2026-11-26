import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PiSdkDriver } from "../dist/pi-sdk-driver.js";
import { createAgentSessionRuntimeWithNpmFallback } from "../dist/npm-package-fallback.js";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";

// Jarvis appends its own instructions (French answers by default) to pi's system prompt.
await test("appendSystemPrompt reaches pi's system prompt and is read again on reload", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "jarvis-system-prompt-"));
  const agentDir = join(root, "agent");
  const workspacePath = join(root, "workspace");
  await mkdir(agentDir, { recursive: true });
  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(agentDir, "auth.json"), "{}");
  await writeFile(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }));

  let instructions = "Réponds en français.";
  let runtime!: AgentSessionRuntime;
  const driver = new PiSdkDriver({
    agentDir,
    catalogFilePath: join(agentDir, "catalogs.json"),
    appendSystemPrompt: () => [instructions],
    createAgentSessionRuntimeImpl: async (options) => {
      runtime = await createAgentSessionRuntimeWithNpmFallback(options);
      return runtime;
    },
  });
  const { ref } = await driver.createSession({
    workspaceId: "prompt-workspace",
    path: workspacePath,
  });
  t.after(() => driver.closeSession(ref));
  assert.match(runtime.session.systemPrompt, /Réponds en français\./);

  instructions = "Consigne mise à jour.";
  assert.equal(await driver.reloadSessionWhenIdle(ref), "reloaded");
  assert.match(runtime.session.systemPrompt, /Consigne mise à jour\./);
  assert.doesNotMatch(runtime.session.systemPrompt, /Réponds en français\./);
});
