import { expect, test } from "@playwright/test";
import { launchDesktop, makeUserDataDir, makeWorkspace } from "../helpers/electron-app";

// Issue #25: the user block sits at the bottom of the sidebar and leads to Settings.
test("shows the simulated development user at the bottom of the sidebar", async () => {
  test.setTimeout(60_000);
  const harness = await launchDesktop(await makeUserDataDir(), {
    initialWorkspaces: [await makeWorkspace("sidebar-account-workspace")],
    testMode: "background",
  });
  try {
    const window = await harness.firstWindow();
    const account = window.getByTestId("sidebar-account");
    await expect(account).toBeVisible();
    await expect(window.getByTestId("sidebar-account-name")).not.toBeEmpty();
    await expect(window.getByTestId("sidebar-account-plan")).toHaveText("Admin");

    const sidebar = await window.locator("#primary-sidebar").boundingBox();
    const block = await account.boundingBox();
    expect(sidebar && block && block.y + block.height).toBeGreaterThan(
      (sidebar?.y ?? 0) + (sidebar?.height ?? 0) - 80,
    );

    await window.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(window.getByTestId("settings-surface")).toBeVisible();
  } finally {
    await harness.close();
  }
});
