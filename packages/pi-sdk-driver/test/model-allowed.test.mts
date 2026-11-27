import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeSupervisor } from "../dist/runtime-supervisor.js";

// Jarvis passes the agency's allowed models; others leave the pickers and cannot be the default.
await test("isModelAllowed filters runtime models and refuses a disallowed default", async () => {
  const root = await mkdtemp(join(tmpdir(), "jarvis-model-allowed-"));
  const agentDir = join(root, "agent");
  const workspacePath = join(root, "workspace");
  await mkdir(agentDir, { recursive: true });
  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(agentDir, "auth.json"), "{}");
  await writeFile(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }));
  await writeFile(
    join(agentDir, "models.json"),
    JSON.stringify({
      providers: {
        "allowed-test": {
          baseUrl: "http://localhost:9/v1",
          api: "openai-completions",
          apiKey: "test-key",
          models: [
            { id: "kept-model", input: ["text"] },
            { id: "dropped-model", input: ["text"] },
          ],
        },
      },
    }),
  );
  const supervisor = new RuntimeSupervisor({
    agentDir,
    isModelAllowed: (provider, modelId) => provider === "allowed-test" && modelId === "kept-model",
  });
  const workspace = { workspaceId: "model-allowed", path: workspacePath };
  const snapshot = await supervisor.getRuntimeSnapshot(workspace);
  assert.deepEqual(
    snapshot.models.map((model) => `${model.providerId}:${model.modelId}`),
    ["allowed-test:kept-model"],
  );
  await assert.rejects(
    () =>
      supervisor.setDefaultModel(workspace, { provider: "allowed-test", modelId: "dropped-model" }),
    /not allowed by the configuration/,
  );
  await supervisor.setDefaultModel(workspace, { provider: "allowed-test", modelId: "kept-model" });
});
