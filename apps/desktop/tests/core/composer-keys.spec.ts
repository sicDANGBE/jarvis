import { expect, test } from "@playwright/test";
import { join } from "node:path";
import {
  createNamedThread,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
  seedAgentDir,
} from "../helpers/electron-app";

// Issue #27: the keypad Enter adds a new line like Shift+Enter; the main Enter sends.
test("keypad Enter and Shift+Enter add a line, main Enter sends", async () => {
  test.setTimeout(60_000);
  const userDataDir = await makeUserDataDir();
  const agentDir = join(userDataDir, "agent");
  const workspacePath = await makeWorkspace("composer-keys-workspace");
  await seedAgentDir(agentDir);
  const harness = await launchDesktop(userDataDir, {
    agentDir,
    initialWorkspaces: [workspacePath],
    testMode: "background",
  });

  try {
    const window = await harness.firstWindow();
    await createNamedThread(window, "Keys session");
    const composer = window.getByTestId("composer");
    await composer.click();

    await composer.pressSequentially("ligne 1");
    await composer.press("NumpadEnter");
    await composer.pressSequentially("ligne 2");
    await composer.press("Shift+Enter");
    await composer.pressSequentially("ligne 3");
    await expect(composer).toHaveValue("ligne 1\nligne 2\nligne 3");

    await composer.press("Enter");
    await expect(composer).toHaveValue("");
    await expect(window.getByTestId("transcript")).toContainText("ligne 3");
  } finally {
    await harness.close();
  }
});
