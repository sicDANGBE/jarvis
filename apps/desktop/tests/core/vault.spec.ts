import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  desktopShortcut,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
} from "../helpers/electron-app";

async function openVault(window: Page) {
  await window.keyboard.press(desktopShortcut(","));
  const surface = window.getByTestId("settings-surface");
  await expect(surface).toBeVisible();
  await surface.getByRole("button", { name: "Vault", exact: true }).click();
  return surface;
}

// Issue #13: without a secure system keyring the vault stays closed and says why.
test("the vault stays closed without a secure keyring", async () => {
  test.setTimeout(60_000);
  const harness = await launchDesktop(await makeUserDataDir(), {
    initialWorkspaces: [await makeWorkspace("vault-closed")],
    testMode: "background",
  });
  try {
    const surface = await openVault(await harness.firstWindow());
    await expect(surface).toContainText("The vault is closed");
  } finally {
    await harness.close();
  }
});

// Issue #13: add, search and delete secrets; values never reach the page and are encrypted on disk.
test("manages secrets without exposing their values", async () => {
  test.setTimeout(60_000);
  const userDataDir = await makeUserDataDir();
  const harness = await launchDesktop(userDataDir, {
    initialWorkspaces: [await makeWorkspace("vault-open")],
    testMode: "background",
    envOverrides: { JARVIS_VAULT_TEST_CIPHER: "1" },
  });
  try {
    const window = await harness.firstWindow();
    const surface = await openVault(window);
    await expect(surface).toContainText("No secrets yet.");

    await surface.getByLabel("Name", { exact: true }).fill("jira-token");
    await surface.getByLabel("Value", { exact: true }).fill("tres-secret-123456");
    await surface.getByRole("button", { name: "Save", exact: true }).click();
    await expect(surface).toContainText("jira-token");
    await expect(surface.getByLabel("Value", { exact: true })).toHaveValue("");
    expect(await window.content()).not.toContain("tres-secret-123456");
    expect(await readFile(join(userDataDir, "vault.json"), "utf8")).not.toContain(
      "tres-secret-123456",
    );

    await surface.getByLabel("Name", { exact: true }).fill("a");
    await surface.getByLabel("Value", { exact: true }).fill("court");
    await surface.getByRole("button", { name: "Save", exact: true }).click();
    await expect(surface.getByRole("alert")).toContainText("au moins 6 caractères");

    await surface.getByLabel("Search secrets").fill("zzz");
    await expect(surface).toContainText("No secret matches");
    await surface.getByLabel("Search secrets").fill("jira");
    window.once("dialog", (dialog) => {
      dialog.accept().catch(() => undefined);
    });
    await surface.getByRole("button", { name: "Delete jira-token" }).click();
    await expect(surface).toContainText("No secrets yet.");
  } finally {
    await harness.close();
  }
});
