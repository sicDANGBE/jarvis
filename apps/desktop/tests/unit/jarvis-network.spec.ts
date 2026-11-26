import { createServer } from "node:http";
import http from "node:http";
import type { AddressInfo } from "node:net";

import { expect, test } from "@playwright/test";

import type { NetworkActivityEvent } from "../../contracts/network";
import {
  classifyAddress,
  decideNetworkAccess,
  DEFAULT_NETWORK_POLICY,
  NetworkGateway,
} from "../../electron/jarvis/network-gateway";

test.describe("passerelle réseau", () => {
  test("classe les adresses : boucle locale, intranet, Internet", () => {
    expect(classifyAddress("127.0.0.1")).toBe("loopback");
    expect(classifyAddress("::1")).toBe("loopback");
    for (const ip of ["10.1.2.3", "172.16.0.1", "172.31.255.1", "192.168.1.10", "100.64.0.1"]) {
      expect(classifyAddress(ip)).toBe("private");
    }
    expect(classifyAddress("fd12:3456::1")).toBe("private");
    expect(classifyAddress("fe80::1")).toBe("private");
    expect(classifyAddress("::ffff:10.0.0.1")).toBe("private");
    for (const ip of ["8.8.8.8", "172.32.0.1", "100.128.0.1", "2001:4860::8888", "nimporte"]) {
      expect(classifyAddress(ip)).toBe("public");
    }
  });

  test("intranet par défaut : Internet bloqué, hôtes de la configuration autorisés", () => {
    const target = (host: string, addresses: string[]) => ({ host, port: 443, addresses });
    expect(
      decideNetworkAccess(DEFAULT_NETWORK_POLICY, target("llm.intra", ["10.0.0.5"])).allowed,
    ).toBe(true);
    expect(
      decideNetworkAccess(DEFAULT_NETWORK_POLICY, target("api.github.com", ["140.82.1.1"])).allowed,
    ).toBe(false);
    // Un nom qui se résout à la fois vers l'intranet et vers Internet est bloqué.
    expect(
      decideNetworkAccess(DEFAULT_NETWORK_POLICY, target("mixte", ["10.0.0.5", "8.8.8.8"])).allowed,
    ).toBe(false);
    const withHost = { mode: "intranet" as const, hosts: ["api.github.com"] };
    expect(decideNetworkAccess(withHost, target("api.github.com", ["140.82.1.1"])).allowed).toBe(
      true,
    );
    const denyAll = { mode: "deny-all" as const, hosts: ["api.github.com"] };
    expect(decideNetworkAccess(denyAll, target("api.github.com", ["140.82.1.1"])).allowed).toBe(
      false,
    );
    expect(decideNetworkAccess(denyAll, target("localhost", ["127.0.0.1"])).allowed).toBe(true);
    const allowlist = { mode: "allowlist" as const, hosts: ["llm.intra"] };
    expect(decideNetworkAccess(allowlist, target("autre.intra", ["10.0.0.6"])).allowed).toBe(false);
  });

  test("bloque les sockets Node vers Internet avant toute connexion et signale chaque tentative", async () => {
    const events: NetworkActivityEvent[] = [];
    const gateway = new NetworkGateway(DEFAULT_NETWORK_POLICY, (event) => events.push(event));
    gateway.installNodeGuard();

    const server = createServer((_request, response) => response.end("ok"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    try {
      // Boucle locale : autorisée, sans avertissement.
      expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toBe("ok");
      expect(await (await fetch(`http://localhost:${port}/`)).text()).toBe("ok");
      expect(events).toHaveLength(0);

      // Adresse Internet littérale : refusée par fetch.
      const literal = await fetch("http://8.8.8.8/").then(
        () => "connecté",
        (error: { cause?: { code?: string } }) => error.cause?.code,
      );
      expect(literal).toBe("EJARVISNETWORK");

      // Nom d'hôte résolu vers Internet : refusé après la résolution, par http.
      const resolvedPublic = await new Promise<string>((resolve) => {
        const request = http.get({
          host: "exemple.invalid",
          port: 80,
          lookup: (_host, options, callback) =>
            (options as { all?: boolean }).all
              ? callback(null, [{ address: "93.184.216.34", family: 4 }])
              : callback(null, "93.184.216.34", 4),
        });
        request.on("error", (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message));
        request.on("response", () => resolve("connecté"));
      });
      expect(resolvedPublic).toBe("EJARVISNETWORK");

      expect(events.map((event) => [event.host, event.allowed])).toEqual([
        ["8.8.8.8", false],
        ["exemple.invalid", false],
      ]);
      expect(events[1]?.address).toBe("93.184.216.34");
      expect(gateway.recentActivity()).toHaveLength(2);
    } finally {
      server.close();
    }
  });
});
