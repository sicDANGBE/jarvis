import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  desktopShortcut,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
  seedAgentDir,
} from "../helpers/electron-app";

async function modelsPage(allowed: readonly string[]) {
  const userDataDir = await makeUserDataDir();
  const agentDir = join(userDataDir, "agent");
  await seedAgentDir(agentDir);
  await writeFile(
    join(userDataDir, "jarvis-config.json"),
    JSON.stringify({ models: { allowed, default: "openai:gpt-5" } }),
  );
  const harness = await launchDesktop(userDataDir, {
    agentDir,
    initialWorkspaces: [await makeWorkspace("agency-models-workspace")],
    testMode: "background",
  });
  const window = await harness.firstWindow();
  await window.keyboard.press(desktopShortcut(","));
  const surface = window.getByTestId("settings-surface");
  await expect(surface).toBeVisible();
  await surface.getByRole("button", { name: "Models", exact: true }).click();
  return { harness, surface };
}

// Issue #4: only the models the agency allows appear in Jarvis.
test("the local development configuration limits the models offered", async () => {
  test.setTimeout(60_000);
  const { harness, surface } = await modelsPage(["openai:gpt-5"]);
  try {
    await expect(surface).toContainText(/gpt-5/i);
    await expect(surface).not.toContainText(/gpt-4o/i);
  } finally {
    await harness.close();
  }
});

test("a wildcard keeps every model of the provider", async () => {
  test.setTimeout(60_000);
  const { harness, surface } = await modelsPage(["openai:*"]);
  try {
    await expect(surface).toContainText(/gpt-4o/i);
  } finally {
    await harness.close();
  }
});
