import { stat } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { launchDesktop, makeUserDataDir, makeWorkspace } from "../helpers/electron-app";

// Issue #2: without an imposed agent folder, Jarvis uses its own, under its data folder.
test("uses its own agent folder instead of ~/.pi/agent", async () => {
  test.setTimeout(60_000);
  const userDataDir = await makeUserDataDir();
  const harness = await launchDesktop(userDataDir, {
    initialWorkspaces: [await makeWorkspace("agent-dir-workspace")],
    testMode: "background",
    envOverrides: { PI_CODING_AGENT_DIR: undefined },
  });
  try {
    await harness.firstWindow();
    const agentDir = await harness.electronApp.evaluate(() => process.env.PI_CODING_AGENT_DIR);
    expect(agentDir).toBe(join(userDataDir, "agent"));
    expect((await stat(join(userDataDir, "agent"))).isDirectory()).toBe(true);
  } finally {
    await harness.close();
  }
});
