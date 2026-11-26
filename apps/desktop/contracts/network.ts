/** One network access attempt seen by Jarvis's network gateway (see electron/jarvis/network-gateway.ts). */
export interface NetworkActivityEvent {
  readonly id: number;
  /** ISO timestamp. */
  readonly at: string;
  /** Where the attempt came from: Node sockets in the main process, or Chromium. */
  readonly source: "node" | "chromium";
  readonly host: string;
  readonly port?: number;
  /** Resolved destination address, when known. */
  readonly address?: string;
  readonly allowed: boolean;
  /** Short French explanation shown to the user. */
  readonly reason: string;
}

export type NetworkActivityListener = (event: NetworkActivityEvent) => void;
