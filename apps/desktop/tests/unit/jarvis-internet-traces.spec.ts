import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import type { NetworkActivityEvent } from "../../contracts/network";
import { InternetTraceLog, type InternetTrace } from "../../electron/jarvis/internet-traces";

const HOUR = 60 * 60 * 1000;

function event(at: Date, host: string, address: string, allowed = true): NetworkActivityEvent {
  return {
    id: 1,
    at: at.toISOString(),
    source: "node",
    host,
    port: 443,
    address,
    allowed,
    reason: "r",
  };
}

test.describe("traces des requêtes Internet", () => {
  test("trace seulement Internet, sans contenu, et oublie après 48 h", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-traces-"));
    try {
      let now = new Date("2026-11-28T10:00:00Z");
      const log = new InternetTraceLog(
        join(dir, "t", "internet.jsonl"),
        join(dir, "t", "s.json"),
        () => now,
      );
      log.record(event(now, "intranet.local", "10.0.0.2"));
      log.record(event(now, "localhost", "127.0.0.1"));
      log.record(event(now, "api.exemple.com", "93.184.216.34"));
      expect(log.read().map((trace) => trace.host)).toEqual(["api.exemple.com"]);
      expect(Object.keys(log.read()[0] ?? {}).sort()).toEqual(
        ["address", "allowed", "at", "host", "port", "reason", "source"].sort(),
      );

      now = new Date(now.getTime() + 49 * HOUR);
      log.record(event(now, "recent.exemple.com", "93.184.216.35"));
      expect(log.prune().map((trace) => trace.host)).toEqual(["recent.exemple.com"]);
      expect(await readFile(join(dir, "t", "internet.jsonl"), "utf8")).not.toContain(
        "api.exemple.com",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("en défaut sans envoi réussi depuis 48 h ; un envoi réussi rétablit et n'envoie pas deux fois", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-traces-"));
    try {
      let now = new Date("2026-11-28T10:00:00Z");
      const log = new InternetTraceLog(join(dir, "i.jsonl"), join(dir, "s.json"), () => now);
      expect(log.isInFault()).toBe(false);
      log.record(event(now, "a.exemple.com", "93.184.216.34"));

      now = new Date(now.getTime() + 47 * HOUR);
      expect(log.isInFault()).toBe(false);
      now = new Date(now.getTime() + 2 * HOUR);
      expect(log.isInFault()).toBe(true);

      const sent: InternetTrace[][] = [];
      await expect(
        log.upload(() => Promise.reject(new Error("serveur indisponible"))),
      ).rejects.toThrow();
      expect(log.isInFault()).toBe(true);

      log.record(event(now, "b.exemple.com", "93.184.216.35"));
      expect(await log.upload(async (traces) => void sent.push([...traces]))).toBe(1);
      expect(sent[0]?.map((trace) => trace.host)).toEqual(["b.exemple.com"]);
      expect(log.isInFault()).toBe(false);
      expect(await log.upload(async (traces) => void sent.push([...traces]))).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
