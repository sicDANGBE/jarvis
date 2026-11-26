import { expect, test, type Page } from "@playwright/test";
import { translatorFor } from "../../src/i18n/translate";
import {
  type DesktopHarness,
  desktopShortcut,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
} from "../helpers/electron-app";

const english = translatorFor("en");
const chinese = translatorFor("zh-CN");

async function openAppearance(window: Page) {
  await window.keyboard.press(desktopShortcut(","));
  const surface = window.getByTestId("settings-surface");
  await expect(surface).toBeVisible();
  await surface.getByRole("button", { name: /^(Appearance|Apparence|外观)$/ }).click();
  return surface;
}

function languagePicker(window: Page) {
  return window.getByRole("combobox", { name: /^(Language|Langue|语言)$/ });
}

async function openSecondWindow(harness: DesktopHarness): Promise<Page> {
  const existing = new Set(harness.electronApp.windows());
  // The app's native New Window shortcut is handled in before-input-event.
  await harness.electronApp.evaluate(
    ({ BrowserWindow }, modifier) => {
      BrowserWindow.getAllWindows()[0]?.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: "n",
        modifiers: [modifier, "shift"],
      });
    },
    process.platform === "darwin" ? "meta" : "control",
  );
  await expect.poll(() => harness.electronApp.windows().length).toBe(existing.size + 1);
  const opened = harness.electronApp.windows().find((candidate) => !existing.has(candidate));
  if (!opened) throw new Error("Expected New Window to create a second desktop window");
  await opened.waitForLoadState("domcontentloaded");
  return opened;
}

test("Settings switches to Simplified Chinese and back, and the choice survives a restart", async () => {
  test.setTimeout(90_000);
  const userDataDir = await makeUserDataDir();
  const workspacePath = await makeWorkspace("settings-language");
  const launch = () => launchDesktop(userDataDir, { initialWorkspaces: [workspacePath] });

  const firstRun = await launch();
  try {
    const window = await firstRun.firstWindow();
    const surface = await openAppearance(window);

    // Until the user picks one, Jarvis shows French (decision D2); the test harness forces
    // English through JARVIS_UI_LOCALE so the other suites can assert the English copy.
    await expect(languagePicker(window)).toHaveValue("en");
    await expect(window.locator("html")).toHaveAttribute("lang", "en");

    await languagePicker(window).selectOption("zh-CN");
    await expect(window.locator("html")).toHaveAttribute("lang", "zh-CN");
    // The page re-renders in place: header, navigation and controls, no restart.
    await expect(
      surface.getByRole("heading", { name: chinese("settings.nav.appearance") }),
    ).toBeVisible();
    await expect(
      surface.getByRole("button", { name: chinese("settings.nav.providers") }),
    ).toBeVisible();
    await expect(surface).toContainText(chinese("settings.appearance.transparency.title"));
    await expect(surface).not.toContainText(english("settings.appearance.transparency.title"));

    // Other pages read Chinese too.
    await surface.getByRole("button", { name: chinese("settings.nav.notifications") }).click();
    await expect(
      surface.getByRole("heading", { name: chinese("settings.nav.notifications") }),
    ).toBeVisible();
    await surface.getByRole("button", { name: chinese("settings.nav.appearance") }).click();
  } finally {
    await firstRun.close();
  }

  const secondRun = await launch();
  try {
    const window = await secondRun.firstWindow();
    await expect(window.locator("html")).toHaveAttribute("lang", "zh-CN");
    const surface = await openAppearance(window);
    await expect(languagePicker(window)).toHaveValue("zh-CN");
    await expect(surface).toContainText(chinese("settings.appearance.transparency.title"));

    // Back to English: an explicit choice wins over the OS language.
    await languagePicker(window).selectOption("en");
    await expect(window.locator("html")).toHaveAttribute("lang", "en");
    await expect(surface.getByRole("heading", { name: "Appearance" })).toBeVisible();
    await expect(surface).toContainText("Window transparency");
    await expect(surface).not.toContainText(chinese("settings.appearance.transparency.title"));
  } finally {
    await secondRun.close();
  }
});

test("a language picked in one window applies to the other open windows", async () => {
  test.setTimeout(60_000);
  const userDataDir = await makeUserDataDir();
  const workspacePath = await makeWorkspace("settings-language-windows");
  const harness = await launchDesktop(userDataDir, { initialWorkspaces: [workspacePath] });
  try {
    const first = await harness.firstWindow();
    const second = await openSecondWindow(harness);
    await openAppearance(first);
    await languagePicker(first).selectOption("zh-CN");
    await expect(first.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(second.locator("html")).toHaveAttribute("lang", "zh-CN");
    const secondSurface = await openAppearance(second);
    await expect(languagePicker(second)).toHaveValue("zh-CN");
    await expect(secondSurface).toContainText(chinese("settings.appearance.transparency.title"));
  } finally {
    await harness.close();
  }
});

// Decision D2: without a choice, Jarvis is in French, whatever the OS language.
test("Jarvis shows French by default", async () => {
  test.setTimeout(60_000);
  const harness = await launchDesktop(await makeUserDataDir(), {
    initialWorkspaces: [await makeWorkspace("settings-language-default")],
    envOverrides: { JARVIS_UI_LOCALE: undefined },
  });
  try {
    const window = await harness.firstWindow();
    await expect(window.locator("html")).toHaveAttribute("lang", "fr");
    const surface = await openAppearance(window);
    await expect(languagePicker(window)).toHaveValue("fr");
    await expect(surface.getByRole("heading", { name: "Apparence" })).toBeVisible();
  } finally {
    await harness.close();
  }
});
