export const RELEASE_REPOSITORY = "sicDANGBE/jarvis";
export const RELEASES_PAGE_URL = `https://github.com/${RELEASE_REPOSITORY}/releases`;
export const RELEASE_API_URL = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;

export interface ReleaseUpdateManifest {
  readonly schema: 1;
  readonly repository: typeof RELEASE_REPOSITORY;
  readonly version: string;
  readonly platform: "win32";
  readonly arch: "x64";
  readonly asset: string;
  readonly sha256: string;
  readonly size: number;
}

export function validateReleaseManifest(value: unknown, version: string): ReleaseUpdateManifest {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Updates require a stable fork version");
  const data = value as Partial<ReleaseUpdateManifest> | null;
  if (
    !data ||
    data.schema !== 1 ||
    data.repository !== RELEASE_REPOSITORY ||
    data.version !== version ||
    data.platform !== "win32" ||
    data.arch !== "x64" ||
    data.asset !== `jarvis-${version}-win-x64.zip` ||
    typeof data.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.sha256) ||
    !Number.isSafeInteger(data.size) ||
    !data.size ||
    data.size < 0 ||
    data.size > 800 * 1024 * 1024
  ) {
    throw new Error("Invalid fork update manifest");
  }
  return data as ReleaseUpdateManifest;
}

export function releaseAssetUrl(version: string, asset: string): string {
  if (
    !/^\d+\.\d+\.\d+$/.test(version) ||
    !["jarvis-update.json", `jarvis-${version}-win-x64.zip`].includes(asset)
  ) {
    throw new Error("Invalid fork update asset");
  }
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/v${version}/${asset}`;
}
