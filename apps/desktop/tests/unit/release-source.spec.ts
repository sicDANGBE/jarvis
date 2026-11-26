import { expect, test } from "@playwright/test";
import {
  validateReleaseManifest,
  releaseAssetUrl,
  RELEASE_REPOSITORY,
} from "../../electron/platform/release-source";

const valid = {
  schema: 1,
  repository: RELEASE_REPOSITORY,
  version: "1.1.0",
  platform: "win32",
  arch: "x64",
  asset: "jarvis-1.1.0-win-x64.zip",
  sha256: "a".repeat(64),
  size: 1024,
};
test("updates are pinned to the Jarvis repository and exact stable version", () => {
  expect(validateReleaseManifest(valid, "1.1.0")).toEqual(valid);
  expect(releaseAssetUrl("1.1.0", valid.asset)).toBe(
    "https://github.com/sicDANGBE/jarvis/releases/download/v1.1.0/jarvis-1.1.0-win-x64.zip",
  );
  for (const version of ["../main", "1.1.0-beta.1", "latest"])
    expect(() => releaseAssetUrl(version, valid.asset)).toThrow();
  expect(() => releaseAssetUrl("1.1.0", "../../other.zip")).toThrow();
});
test("reject foreign, mismatched, oversized and malformed release payloads", () => {
  for (const patch of [
    { repository: "other-org/other-repo" },
    { version: "1.2.0" },
    { arch: "arm64" },
    { platform: "linux" },
    { asset: "jarvis.exe" },
    { sha256: "invalid" },
    { size: -1 },
    { size: 0 },
    { size: 1e12 },
    { schema: 2 },
  ]) {
    expect(() => validateReleaseManifest({ ...valid, ...patch }, "1.1.0")).toThrow();
  }
  expect(() => validateReleaseManifest(null, "1.1.0")).toThrow();
});
