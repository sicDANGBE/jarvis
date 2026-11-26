import { expect, test } from "@playwright/test";
import { launchDesktop, makeUserDataDir, makeWorkspace } from "../helpers/electron-app";

// Issue #40: intranet only by default, and the user sees every network access attempt.
test("blocks Internet access from the main process and tells the user", async () => {
  test.setTimeout(60_000);
  const userDataDir = await makeUserDataDir();
  const workspacePath = await makeWorkspace("network-gateway-workspace");
  const harness = await launchDesktop(userDataDir, {
    initialWorkspaces: [workspacePath],
    testMode: "background",
  });

  try {
    const window = await harness.firstWindow();
    await expect(window.getByTestId("network-notices")).toBeAttached();

    const outcome = await harness.electronApp.evaluate(async () => {
      try {
        await fetch("http://8.8.8.8/");
        return "connecté";
      } catch (error) {
        return (error as { cause?: { code?: string } }).cause?.code ?? String(error);
      }
    });
    expect(outcome).toBe("EJARVISNETWORK");

    const notice = window.getByTestId("network-notice").filter({ hasText: "8.8.8.8" });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute("data-allowed", "false");
    await expect(notice).toContainText("Adresse Internet bloquée");

    type ActivityApi = {
      readonly piApp?: {
        getNetworkActivity(): Promise<readonly { host: string; allowed: boolean }[]>;
      };
    };
    const activity = await window.evaluate(() =>
      (globalThis as unknown as ActivityApi).piApp?.getNetworkActivity(),
    );
    expect(activity?.some((event) => event.host === "8.8.8.8" && !event.allowed)).toBe(true);
  } finally {
    await harness.close();
  }
});
