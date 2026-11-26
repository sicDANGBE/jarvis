/**
 * Passerelle réseau de Jarvis : décide de chaque connexion sortante du process main (sockets Node :
 * fetch, http, https, SDK des fournisseurs) et de Chromium (requêtes des fenêtres), et signale
 * chaque tentative à l'utilisateur.
 *
 * Politique par défaut : **intranet**. Sont joignables la boucle locale, les adresses privées
 * (RFC 1918, CGNAT 100.64/10, lien local, IPv6 ULA) et les hôtes explicitement autorisés par la
 * configuration de l'agence. Tout le reste est bloqué avant l'établissement de la connexion.
 *
 * Le contrôle porte sur l'adresse réellement jointe, après résolution DNS : un nom d'hôte qui se
 * résout vers une adresse publique est bloqué en mode intranet, quel que soit son nom.
 *
 * Limites : les processus enfants (terminal, outil bash de Pi, serveurs MCP en stdio, git, ssh)
 * ont leurs propres sockets et ne passent pas par cette passerelle ; voir docs/securite.md.
 */
import dns from "node:dns";
import net from "node:net";

import type { NetworkActivityEvent } from "../../contracts/network";
import { createHostMatcher } from "./egress-guard";

export type NetworkMode = "intranet" | "allowlist" | "deny-all" | "open";

export interface NetworkPolicy {
  readonly mode: NetworkMode;
  /** Hôtes autorisés en plus de l'intranet : "hote", "*.domaine", "hote:port". */
  readonly hosts: readonly string[];
}

export const DEFAULT_NETWORK_POLICY: NetworkPolicy = { mode: "intranet", hosts: [] };

export type AddressScope = "loopback" | "private" | "public";

function ipv4Parts(ip: string): number[] | undefined {
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    ? parts
    : undefined;
}

/** Classe une adresse IP littérale. Toute adresse non reconnue est considérée publique. */
export function classifyAddress(address: string): AddressScope {
  let ip = address
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped?.[1]) ip = mapped[1];
  const v4 = ipv4Parts(ip);
  if (v4) {
    const [a = 0, b = 0] = v4;
    if (a === 127) return "loopback";
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return "private";
    }
    if (a === 100 && b >= 64 && b <= 127) return "private"; // CGNAT, fréquent sur les VPN
    if (a === 169 && b === 254) return "private"; // lien local
    return "public";
  }
  if (net.isIPv6(ip)) {
    if (ip === "::1") return "loopback";
    if (/^f[cd][0-9a-f]{2}:/.test(ip)) return "private"; // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/.test(ip)) return "private"; // lien local fe80::/10
    return "public";
  }
  return "public";
}

export interface NetworkTarget {
  readonly host: string;
  readonly port: number | undefined;
  /** Adresses résolues ; absentes quand la décision se prend avant la résolution. */
  readonly addresses: readonly string[];
}

export interface NetworkDecision {
  readonly allowed: boolean;
  readonly reason: string;
  /** Vrai pour la boucle locale : autorisée sans avertir l'utilisateur. */
  readonly local: boolean;
}

export function decideNetworkAccess(policy: NetworkPolicy, target: NetworkTarget): NetworkDecision {
  const scopes = target.addresses.map(classifyAddress);
  if (scopes.length > 0 && scopes.every((scope) => scope === "loopback")) {
    return { allowed: true, reason: "Boucle locale", local: true };
  }
  if (policy.mode === "open") {
    return { allowed: true, reason: "Politique ouverte", local: false };
  }
  const port = String(target.port ?? 443);
  const listed = (() => {
    try {
      return createHostMatcher(policy.hosts)(target.host, port);
    } catch {
      return false;
    }
  })();
  if (policy.mode !== "deny-all" && listed) {
    return { allowed: true, reason: "Hôte autorisé par la configuration", local: false };
  }
  if (policy.mode === "intranet" && scopes.length > 0 && scopes.every((s) => s !== "public")) {
    return { allowed: true, reason: "Intranet", local: false };
  }
  if (policy.mode === "intranet" && scopes.some((s) => s === "public")) {
    return {
      allowed: false,
      reason: "Adresse Internet bloquée (intranet seulement)",
      local: false,
    };
  }
  return { allowed: false, reason: "Hôte non autorisé par la configuration", local: false };
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;
type LookupFunction = (
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback,
) => void;

interface ConnectOptions {
  readonly host?: string;
  readonly port?: number | string;
  readonly path?: string | null;
  readonly lookup?: LookupFunction;
}

export class NetworkBlockedError extends Error {
  readonly code = "EJARVISNETWORK";
}

const MAX_EVENTS = 200;

export class NetworkGateway {
  private policy: NetworkPolicy;
  private readonly events: NetworkActivityEvent[] = [];
  private nextId = 1;
  private nodeInstalled = false;

  constructor(
    policy: NetworkPolicy = DEFAULT_NETWORK_POLICY,
    private readonly notify: (event: NetworkActivityEvent) => void = () => {},
    private readonly now: () => Date = () => new Date(),
  ) {
    this.policy = policy;
  }

  setPolicy(policy: NetworkPolicy): void {
    this.policy = policy;
  }

  getPolicy(): NetworkPolicy {
    return this.policy;
  }

  recentActivity(): readonly NetworkActivityEvent[] {
    return [...this.events];
  }

  decide(target: NetworkTarget): NetworkDecision {
    return decideNetworkAccess(this.policy, target);
  }

  /** Décide, enregistre et signale. La boucle locale n'est ni enregistrée ni signalée. */
  check(source: NetworkActivityEvent["source"], target: NetworkTarget): NetworkDecision {
    const decision = this.decide(target);
    if (decision.local) return decision;
    const event: NetworkActivityEvent = {
      id: this.nextId++,
      at: this.now().toISOString(),
      source,
      host: target.host,
      ...(target.port === undefined ? {} : { port: target.port }),
      ...(target.addresses[0] ? { address: target.addresses[0] } : {}),
      allowed: decision.allowed,
      reason: decision.reason,
    };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    try {
      this.notify(event);
    } catch (error) {
      console.error("[network-gateway] notify failed", error);
    }
    return decision;
  }

  /** Contrôle une URL avant un appel fait par Jarvis lui-même (mise à jour, configuration…). */
  async checkUrl(url: string): Promise<NetworkDecision> {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const port = parsed.port
      ? Number(parsed.port)
      : parsed.protocol === "http:" || parsed.protocol === "ws:"
        ? 80
        : 443;
    const addresses = net.isIP(host) ? [host] : await resolveAll(host);
    return this.check("chromium", { host, port, addresses });
  }

  /**
   * Intercepte `net.Socket.prototype.connect`, par lequel passent fetch, http, https et tls dans
   * le process main. Une adresse littérale est jugée tout de suite ; un nom d'hôte l'est après
   * sa résolution DNS, avant toute connexion.
   */
  installNodeGuard(): void {
    if (this.nodeInstalled) return;
    this.nodeInstalled = true;
    const gateway = this;
    const originalConnect = net.Socket.prototype.connect as (...args: unknown[]) => net.Socket;

    net.Socket.prototype.connect = function guardedConnect(this: net.Socket, ...args: unknown[]) {
      const holder = connectOptionsHolder(args);
      if (!holder) return originalConnect.apply(this, args);
      const options = holder.get();
      if (typeof options.path === "string") return originalConnect.apply(this, args); // socket local
      const host = (options.host ?? "localhost").replace(/^\[|\]$/g, "");
      const port = options.port === undefined ? undefined : Number(options.port);

      if (net.isIP(host)) {
        const decision = gateway.check("node", { host, port, addresses: [host] });
        if (!decision.allowed) {
          const socket = this;
          process.nextTick(() => socket.destroy(blockedError(host, decision)));
          return this;
        }
        return originalConnect.apply(this, args);
      }

      const baseLookup: LookupFunction =
        options.lookup ?? (dns.lookup as unknown as LookupFunction);
      const guardedLookup: LookupFunction = (hostname, lookupOptions, callback) => {
        baseLookup(hostname, lookupOptions, (error, address, family) => {
          if (error) return callback(error, address, family);
          const addresses = Array.isArray(address)
            ? address.map((entry) => entry.address)
            : [address];
          const decision = gateway.check("node", { host, port, addresses });
          if (!decision.allowed) return callback(blockedError(host, decision), address, family);
          callback(null, address, family);
        });
      };
      holder.set({ ...options, lookup: guardedLookup });
      return originalConnect.apply(this, args);
    } as typeof net.Socket.prototype.connect;
  }

  /** Applique la politique aux requêtes d'une session Chromium. */
  installChromiumGuard(session: Electron.Session): void {
    session.webRequest.onBeforeRequest(
      { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
      (details, callback) => {
        void this.checkUrl(details.url)
          .then((decision) => callback({ cancel: !decision.allowed }))
          .catch(() => callback({ cancel: true }));
      },
    );
  }
}

function blockedError(host: string, decision: NetworkDecision): NetworkBlockedError {
  return new NetworkBlockedError(`Jarvis : accès réseau bloqué vers ${host} (${decision.reason})`);
}

async function resolveAll(host: string): Promise<string[]> {
  if (host === "localhost") return ["127.0.0.1"];
  try {
    const entries = await dns.promises.lookup(host, { all: true });
    return entries.map((entry) => entry.address);
  } catch {
    return [];
  }
}

interface OptionsHolder {
  get(): ConnectOptions;
  set(options: ConnectOptions): void;
}

/**
 * Retrouve les options de connexion dans les différentes formes d'appel de `Socket.connect` :
 * tableau déjà normalisé par `net.connect` (modifié sur place pour garder son marqueur interne),
 * objet d'options, ou `(port, host)`. Renvoie undefined pour une forme inconnue.
 */
function connectOptionsHolder(args: unknown[]): OptionsHolder | undefined {
  const first = args[0];
  if (Array.isArray(first) && first[0] !== null && typeof first[0] === "object") {
    return {
      get: () => first[0] as ConnectOptions,
      set: (options) => {
        first[0] = options;
      },
    };
  }
  if (first !== null && typeof first === "object" && !Array.isArray(first)) {
    return {
      get: () => args[0] as ConnectOptions,
      set: (options) => {
        args[0] = options;
      },
    };
  }
  if (typeof first === "number" || (typeof first === "string" && /^\d+$/.test(first))) {
    const host = typeof args[1] === "string" ? args[1] : "localhost";
    const callback = args.find((arg) => typeof arg === "function");
    let options: ConnectOptions = { port: first, host };
    return {
      get: () => options,
      set: (next) => {
        options = next;
        args.length = 0;
        args.push(options, ...(callback ? [callback] : []));
      },
    };
  }
  if (typeof first === "string") {
    return { get: () => ({ path: first }), set: () => {} };
  }
  return undefined;
}
