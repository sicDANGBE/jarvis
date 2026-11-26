import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { launcherScript } from "../../scripts/after-pack-linux-launcher.cjs";

test.skip(process.platform !== "linux", "lanceur Linux");

// Issue #12 : l'entrée de bureau ne désactive plus la sandbox ; le lanceur retire son marqueur.
test("le lanceur retire le marqueur de l'entrée de bureau et garde les autres arguments", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jarvis-launcher-"));
  try {
    await writeFile(join(dir, "jarvis"), launcherScript("fake.bin"), { mode: 0o755 });
    await writeFile(join(dir, "fake.bin"), '#!/bin/sh\nfor a do printf "[%s]" "$a"; done\n', {
      mode: 0o755,
    });
    const output = execFileSync(
      join(dir, "jarvis"),
      ["--jarvis-desktop-entry", "/dossier avec espace/fichier.txt", "--autre"],
      { env: { ...process.env, JARVIS_FORCE_SANDBOX: "1" }, encoding: "utf8" },
    );
    expect(output).toBe("[/dossier avec espace/fichier.txt][--autre]");
    const builderConfig = await readFile(join(__dirname, "../../electron-builder.yml"), "utf8");
    expect(builderConfig).toMatch(/executableArgs:\s*\n\s*- --jarvis-desktop-entry/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
