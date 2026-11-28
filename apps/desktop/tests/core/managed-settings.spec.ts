import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { launchDesktop, makeUserDataDir, makeWorkspace } from "../helpers/electron-app";

type SettingsApi = {
  readonly piApp?: {
    getManagedSettings(): Promise<readonly { key: string; value: unknown; locked: boolean }[]>;
    setManagedSetting(key: string, value: unknown): Promise<unknown>;
    getNetworkActivity(): Promise<readonly { host: string; allowed: boolean }[]>;
  };
};

// Issue #41: the Internet setting drives the network gateway; an agency lock cannot be overridden.
test("the Internet setting opens the gateway and an agency lock is enforced", async () => {
  test.setTimeout(60_000);
  const userDataDir = await makeUserDataDir();
  await writeFile(
    join(userDataDir, "jarvis-config.json"),
    JSON.stringify({ settings: { "traces.internet.upload": { value: true, locked: true } } }),
  );
  const harness = await launchDesktop(userDataDir, {
    initialWorkspaces: [await makeWorkspace("managed-settings-workspace")],
    testMode: "background",
  });
  try {
    const window = await harness.firstWindow();
    const settings = await window.evaluate(() =>
      (globalThis as unknown as SettingsApi).piApp?.getManagedSettings(),
    );
    expect(settings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "network.internet", value: false, locked: false }),
        expect.objectContaining({ key: "traces.internet.upload", value: true, locked: true }),
      ]),
    );

    const lockError = await window.evaluate(async () => {
      try {
        await (globalThis as unknown as SettingsApi).piApp?.setManagedSetting(
          "traces.internet.upload",
          false,
        );
        return "accepté";
      } catch (error) {
        return String(error);
      }
    });
    expect(lockError).toMatch(/verrouillé/);

    await window.evaluate(() =>
      (globalThis as unknown as SettingsApi).piApp?.setManagedSetting("network.internet", true),
    );
    await harness.electronApp.evaluate(async () => {
      await fetch("http://8.8.8.8/", { signal: AbortSignal.timeout(1500) }).catch(() => undefined);
    });
    const activity = await window.evaluate(() =>
      (globalThis as unknown as SettingsApi).piApp?.getNetworkActivity(),
    );
    expect(activity?.some((event) => event.host === "8.8.8.8" && event.allowed)).toBe(true);
  } finally {
    await harness.close();
  }
});
