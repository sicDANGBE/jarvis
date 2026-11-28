/**
 * Traces des requêtes Internet (issue #42, décision D16).
 *
 * Quand l'accès à Internet est actif, chaque tentative vers une adresse Internet (publique) est
 * enregistrée sur le poste, **sans contenu** : date, hôte, adresse, port, décision, origine. Les
 * traces sont gardées 48 heures. Si l'envoi au serveur de traces est activé, elles y sont envoyées
 * périodiquement ; si aucun envoi n'a réussi depuis plus de 48 heures, le harness se met **en
 * défaut** : Internet est coupé (seuls le poste et l'intranet restent joignables) jusqu'au prochain
 * envoi réussi.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { NetworkActivityEvent } from "../../contracts/network";
import { classifyAddress } from "./network-gateway";

export const TRACE_RETENTION_MS = 48 * 60 * 60 * 1000;

export interface InternetTrace {
  readonly at: string;
  readonly source: NetworkActivityEvent["source"];
  readonly host: string;
  readonly port?: number;
  readonly address: string;
  readonly allowed: boolean;
  readonly reason: string;
}

interface UploadState {
  /** Dernier envoi réussi, ou début de l'obligation d'envoi. */
  readonly lastSuccessAt: string;
  /** Date de la dernière trace déjà envoyée. */
  readonly uploadedThrough?: string;
}

export type TraceUploader = (traces: readonly InternetTrace[]) => Promise<void>;

/** Vrai pour une tentative vers une adresse Internet (ni boucle locale, ni intranet). */
export function isInternetEvent(event: NetworkActivityEvent): boolean {
  return event.address !== undefined && classifyAddress(event.address) === "public";
}

export class InternetTraceLog {
  constructor(
    private readonly file: string,
    private readonly stateFile: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  }

  record(event: NetworkActivityEvent): void {
    if (!isInternetEvent(event) || !event.address) return;
    const trace: InternetTrace = {
      at: event.at,
      source: event.source,
      host: event.host,
      ...(event.port === undefined ? {} : { port: event.port }),
      address: event.address,
      allowed: event.allowed,
      reason: event.reason,
    };
    appendFileSync(this.file, `${JSON.stringify(trace)}\n`, { mode: 0o600 });
  }

  /** Traces de moins de 48 heures ; réécrit le fichier sans les plus anciennes. */
  prune(): readonly InternetTrace[] {
    const limit = this.now().getTime() - TRACE_RETENTION_MS;
    const kept = this.read().filter((trace) => Date.parse(trace.at) >= limit);
    const temporary = `${this.file}.${process.pid}.tmp`;
    writeFileSync(temporary, kept.map((trace) => `${JSON.stringify(trace)}\n`).join(""), {
      mode: 0o600,
    });
    renameSync(temporary, this.file);
    return kept;
  }

  read(): readonly InternetTrace[] {
    let text: string;
    try {
      text = readFileSync(this.file, "utf8");
    } catch {
      return [];
    }
    const traces: InternetTrace[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        traces.push(JSON.parse(line) as InternetTrace);
      } catch {
        // Ligne tronquée (arrêt brutal) : ignorée.
      }
    }
    return traces;
  }

  /** État d'envoi ; l'obligation démarre au premier appel si aucun état n'existe. */
  uploadState(): UploadState {
    try {
      const parsed = JSON.parse(readFileSync(this.stateFile, "utf8")) as Partial<UploadState>;
      if (typeof parsed.lastSuccessAt === "string") return parsed as UploadState;
    } catch {
      // Pas encore d'état.
    }
    const initial = { lastSuccessAt: this.now().toISOString() };
    this.writeState(initial);
    return initial;
  }

  /** Vrai si l'envoi est obligatoire et n'a pas réussi depuis plus de 48 heures. */
  isInFault(): boolean {
    const last = Date.parse(this.uploadState().lastSuccessAt);
    return this.now().getTime() - last > TRACE_RETENTION_MS;
  }

  /** Envoie les traces pas encore envoyées ; renvoie le nombre envoyé. */
  async upload(uploader: TraceUploader): Promise<number> {
    const state = this.uploadState();
    const since = state.uploadedThrough ? Date.parse(state.uploadedThrough) : -Infinity;
    const pending = this.prune().filter((trace) => Date.parse(trace.at) > since);
    await uploader(pending);
    this.writeState({
      lastSuccessAt: this.now().toISOString(),
      uploadedThrough: pending.at(-1)?.at ?? state.uploadedThrough,
    });
    return pending.length;
  }

  private writeState(state: UploadState): void {
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
    renameSync(temporary, this.stateFile);
  }
}
