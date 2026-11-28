/** A secret as the renderer sees it: never its value (see electron/jarvis/vault-service.ts). */
export interface VaultSecretSummary {
  readonly name: string;
  readonly updatedAt: string;
}

export type VaultState =
  | { readonly available: true; readonly secrets: readonly VaultSecretSummary[] }
  | { readonly available: false; readonly reason: string };
