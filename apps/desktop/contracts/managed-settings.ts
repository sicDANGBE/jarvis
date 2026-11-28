/** Where a managed setting's current value comes from (see electron/jarvis/managed-settings.ts). */
export type ManagedSettingSource = "agency" | "user" | "jarvis";

/** One managed setting as the renderer sees it. */
export interface ManagedSettingView {
  readonly key: string;
  readonly value: boolean | string | readonly string[];
  readonly source: ManagedSettingSource;
  /** Locked by the agency: the user cannot change it. */
  readonly locked: boolean;
}
