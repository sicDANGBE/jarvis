import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { syncManagedLlmProvider } from "../../electron/jarvis/llm-provider";
import { parseLocalDevConfig } from "../../electron/jarvis/local-config";

const llm = {
  baseUrl: "https://llm.agence.fr/v1",
  apiKey: "$LITELLM_API_KEY",
  models: [
    { id: "mistral-large", label: "Mistral Large", contextWindow: 131072, maxOutputTokens: 8192 },
  ],
};

test.describe("fournisseur LiteLLM de l'agence", () => {
  test("la configuration déclare le fournisseur et valide ses champs", () => {
    expect(parseLocalDevConfig({ llm }).llm).toEqual({ providerId: "agence", ...llm });
    expect(() => parseLocalDevConfig({ llm: { ...llm, baseUrl: "ftp://x" } })).toThrow(/baseUrl/);
    expect(() => parseLocalDevConfig({ llm: { ...llm, models: [] } })).toThrow(/au moins un/);
    expect(() =>
      parseLocalDevConfig({ llm: { ...llm, models: [{ id: "m", contextWindow: -1 }] } }),
    ).toThrow(/entier positif/);
  });

  test("écrit le fournisseur géré dans models.json sans toucher aux autres, puis le retire", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-llm-"));
    try {
      const path = join(dir, "models.json");
      await writeFile(path, JSON.stringify({ providers: { perso: { baseUrl: "http://x" } } }));
      const config = parseLocalDevConfig({ llm }).llm;
      expect(syncManagedLlmProvider(dir, config)).toBe(true);
      const written = JSON.parse(await readFile(path, "utf8")) as {
        providers: Record<string, Record<string, unknown>>;
      };
      expect(written.providers.perso).toEqual({ baseUrl: "http://x" });
      expect(written.providers.agence).toMatchObject({
        jarvisManaged: true,
        baseUrl: "https://llm.agence.fr/v1",
        apiKey: "$LITELLM_API_KEY",
        models: [
          { id: "mistral-large", name: "Mistral Large", contextWindow: 131072, maxTokens: 8192 },
        ],
      });
      expect(syncManagedLlmProvider(dir, config)).toBe(false);
      expect(syncManagedLlmProvider(dir, undefined)).toBe(true);
      const cleared = JSON.parse(await readFile(path, "utf8")) as {
        providers: Record<string, unknown>;
      };
      expect(Object.keys(cleared.providers)).toEqual(["perso"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
