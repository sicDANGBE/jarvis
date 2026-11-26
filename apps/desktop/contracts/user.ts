/** The signed-in user as the renderer sees it (simulated in development, see local-config.ts). */
export interface DesktopUser {
  readonly displayName: string;
  readonly isAdmin: boolean;
  /** Plan or usage quota to recall next to the name, when the configuration provides one. */
  readonly plan?: string;
}
