import { expect, test } from "@playwright/test";

import {
  isDevelopmentBuild,
  loadLocalDevConfig,
  networkPolicyFromConfig,
  parseLocalDevConfig,
  simulatedDevUser,
} from "../../electron/jarvis/local-config";
import { DEFAULT_NETWORK_POLICY } from "../../electron/jarvis/network-gateway";
import { jarvisSystemInstructions } from "../../electron/jarvis/system-prompt";

test.describe("configuration locale de développement", () => {
  test("seules les versions de développement la lisent", () => {
    expect(isDevelopmentBuild(false, "1.0.6")).toBe(true);
    expect(isDevelopmentBuild(true, "1.0.6-nightly.3")).toBe(true);
    expect(isDevelopmentBuild(true, "1.0.6")).toBe(false);
    const read = () => {
      throw new Error("ne doit pas être lu");
    };
    expect(
      loadLocalDevConfig({ userDataDir: "/x", packaged: true, version: "1.0.6", readFile: read }),
    ).toEqual({ status: "production" });
  });

  test("charge un fichier valide, signale un fichier invalide ou absent", () => {
    const load = (content: string | Error) =>
      loadLocalDevConfig({
        userDataDir: "/donnees",
        packaged: true,
        version: "1.0.6-nightly.3",
        readFile: () => {
          if (content instanceof Error) throw content;
          return content;
        },
      });
    const loaded = load(
      JSON.stringify({
        systemPrompt: "Tu es l'assistant de l'agence.",
        egress: { mode: "intranet", hosts: ["llm.exemple.fr"] },
      }),
    );
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;
    expect(loaded.path).toBe("/donnees/jarvis-config.json");
    expect(networkPolicyFromConfig(loaded.config)).toEqual({
      mode: "intranet",
      hosts: ["llm.exemple.fr"],
    });
    expect(load("{ pas du json").status).toBe("invalid");
    expect(load(JSON.stringify({ egress: { mode: "partout" } })).status).toBe("invalid");
    expect(load(Object.assign(new Error("absent"), { code: "ENOENT" })).status).toBe("absent");
  });

  test("intranet par défaut, utilisateur simulé administrateur, prompt de l'agence ajouté", () => {
    expect(networkPolicyFromConfig(undefined)).toEqual(DEFAULT_NETWORK_POLICY);
    expect(networkPolicyFromConfig(parseLocalDevConfig({}))).toEqual({
      mode: "intranet",
      hosts: [],
    });
    expect(simulatedDevUser("Romeo")).toEqual({
      id: "dev-admin",
      displayName: "Romeo",
      isAdmin: true,
      source: "simulated",
    });
    expect(jarvisSystemInstructions()).toHaveLength(1);
    expect(jarvisSystemInstructions()[0]).toContain("Réponds en français");
    expect(jarvisSystemInstructions("  Consigne agence  ")).toEqual([
      jarvisSystemInstructions()[0],
      "Consigne agence",
    ]);
  });
});
