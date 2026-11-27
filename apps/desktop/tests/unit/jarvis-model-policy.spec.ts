import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import {
  applyDefaultModel,
  createModelAllowList,
  parseModelRef,
} from "../../electron/jarvis/model-policy";

test.describe("modèles autorisés par l'agence", () => {
  test("lit les deux formes de motif et le joker final", () => {
    expect(parseModelRef("litellm:mistral-large")).toEqual({
      provider: "litellm",
      model: "mistral-large",
    });
    expect(parseModelRef("agence/mistral-large")).toEqual({
      provider: "agence",
      model: "mistral-large",
    });
    expect(parseModelRef("omniroute:anthropic/claude")).toEqual({
      provider: "omniroute",
      model: "anthropic/claude",
    });
    expect(parseModelRef("sans-separateur")).toBeUndefined();

    const allowed = createModelAllowList(["litellm:mistral-*", "agence/llama"]);
    expect(allowed("litellm", "mistral-large")).toBe(true);
    expect(allowed("litellm", "gpt-5")).toBe(false);
    expect(allowed("agence", "llama")).toBe(true);
    expect(allowed("anthropic", "claude")).toBe(false);
    expect(createModelAllowList(undefined)("n'importe", "quoi")).toBe(true);
    expect(createModelAllowList([])("n'importe", "quoi")).toBe(false);
  });

  test("impose le défaut de l'agence seulement si le défaut actuel est absent ou interdit", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-model-default-"));
    try {
      const isAllowed = createModelAllowList(["litellm:*"]);
      const settings = join(dir, "settings.json");
      await writeFile(
        settings,
        JSON.stringify({ defaultProvider: "litellm", defaultModel: "a", x: 1 }),
      );
      expect(applyDefaultModel({ agentDir: dir, defaultModel: "litellm:b", isAllowed })).toBe(
        false,
      );

      await writeFile(
        settings,
        JSON.stringify({ defaultProvider: "anthropic", defaultModel: "c", x: 1 }),
      );
      expect(applyDefaultModel({ agentDir: dir, defaultModel: "litellm:b", isAllowed })).toBe(true);
      expect(JSON.parse(await readFile(settings, "utf8"))).toEqual({
        defaultProvider: "litellm",
        defaultModel: "b",
        x: 1,
      });
      expect(applyDefaultModel({ agentDir: dir, defaultModel: undefined, isAllowed })).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
