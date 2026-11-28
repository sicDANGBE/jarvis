import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { networkPolicyFromConfig, parseLocalDevConfig } from "../../electron/jarvis/local-config";
import {
  ManagedSettings,
  parseAgencySettings,
  resolveSetting,
} from "../../electron/jarvis/managed-settings";

test.describe("réglages administrés", () => {
  test("ordre de résolution : verrou de l'agence, utilisateur, défaut de l'agence, défaut de Jarvis", () => {
    const key = "network.internet";
    expect(resolveSetting(key, undefined, undefined)).toEqual({
      value: false,
      source: "jarvis",
      locked: false,
    });
    expect(resolveSetting(key, { default: true }, undefined)).toEqual({
      value: true,
      source: "agency",
      locked: false,
    });
    expect(resolveSetting(key, { default: true }, false)).toEqual({
      value: false,
      source: "user",
      locked: false,
    });
    expect(resolveSetting(key, { value: false, locked: true }, true)).toEqual({
      value: false,
      source: "agency",
      locked: true,
    });
  });

  test("la configuration refuse un réglage inconnu ou mal typé", () => {
    expect(parseAgencySettings({ "network.internet": { value: true, locked: true } })).toEqual({
      "network.internet": { value: true, locked: true },
    });
    expect(() => parseAgencySettings({ "inconnu.reglage": { value: true } })).toThrow(/inconnu/);
    expect(() => parseAgencySettings({ "network.internet": { value: "oui" } })).toThrow(/type/);
    expect(() =>
      parseLocalDevConfig({ settings: { "network.internet": { locked: "oui" } } }),
    ).toThrow(/locked/);
  });

  test("le choix de l'utilisateur est enregistré, sauf sur un réglage verrouillé", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-settings-"));
    try {
      const file = join(dir, "jarvis-settings.json");
      const changed: string[] = [];
      const settings = new ManagedSettings(
        { "traces.internet.upload": { value: true, locked: true } },
        file,
        (key) => changed.push(key),
      );
      expect(settings.set("network.internet", true)).toEqual({
        value: true,
        source: "user",
        locked: false,
      });
      expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ "network.internet": true });
      expect(changed).toEqual(["network.internet"]);
      expect(() => settings.set("traces.internet.upload", false)).toThrow(/verrouillé/);
      expect(() => settings.set("network.internet", "oui")).toThrow(/invalide/);
      expect(() => settings.set("inconnu", true)).toThrow(/inconnu/);
      // Relu au prochain démarrage.
      expect(new ManagedSettings({}, file).getBoolean("network.internet")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("le réglage Internet ouvre la politique réseau, sauf si l'agence a tout coupé", () => {
    const intranet = parseLocalDevConfig({ egress: { mode: "intranet", hosts: ["llm.x"] } });
    expect(networkPolicyFromConfig(intranet, false)).toEqual({
      mode: "intranet",
      hosts: ["llm.x"],
    });
    expect(networkPolicyFromConfig(intranet, true)).toEqual({ mode: "open", hosts: [] });
    const denyAll = parseLocalDevConfig({ egress: { mode: "deny-all" } });
    expect(networkPolicyFromConfig(denyAll, true)).toEqual({ mode: "deny-all", hosts: [] });
    expect(networkPolicyFromConfig(undefined, true)).toEqual({ mode: "open", hosts: [] });
  });
});
