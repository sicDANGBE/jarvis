/**
 * Garde de sortie réseau : décide si un outil de l'application peut joindre une URL.
 *
 * Les motifs d'hôte acceptés sont :
 *   - "api.agence.fr"   hôte exact
 *   - "*.agence.fr"     n'importe quel sous-domaine (pas le domaine nu)
 *   - "agence.fr:8443"  hôte + port explicite
 *
 * HTTPS est exigé, sauf vers la boucle locale (localhost, 127.0.0.1, ::1).
 */

export type EgressPolicy =
  | { readonly mode: "open" }
  /** Intranet (adresses privées) plus les hôtes listés ; le contrôle par adresse est fait par la passerelle réseau. */
  | { readonly mode: "intranet"; readonly hosts: readonly string[] }
  | { readonly mode: "allowlist"; readonly hosts: readonly string[] }
  | { readonly mode: "deny-all" };

export type EgressDecision =
  { readonly allowed: true } | { readonly allowed: false; readonly reason: string };

interface HostRule {
  readonly wildcard: boolean;
  readonly host: string;
  readonly port?: string;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function parseRule(pattern: string): HostRule {
  const trimmed = pattern.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.includes("/") || trimmed.includes("@")) {
    throw new Error(`Motif d'hôte invalide : "${pattern}"`);
  }
  const wildcard = trimmed.startsWith("*.");
  const rest = wildcard ? trimmed.slice(2) : trimmed;
  const portMatch = /^(.*):(\d{1,5})$/.exec(rest);
  const host = portMatch?.[1] ?? rest;
  if (host.length === 0 || host.includes("*")) {
    throw new Error(`Motif d'hôte invalide : "${pattern}"`);
  }
  return portMatch?.[2] ? { wildcard, host, port: portMatch[2] } : { wildcard, host };
}

function ruleMatches(rule: HostRule, host: string, port: string): boolean {
  if (rule.port !== undefined && rule.port !== port) {
    return false;
  }
  return rule.wildcard ? host.endsWith(`.${rule.host}`) : host === rule.host;
}

/** Returns a test for "does host:port match one of these patterns" (same syntax as the allowlist). */
export function createHostMatcher(
  patterns: readonly string[],
): (host: string, port: string) => boolean {
  const rules = patterns.map(parseRule);
  return (host, port) => rules.some((rule) => ruleMatches(rule, host.toLowerCase(), port));
}

export interface EgressGuard {
  check(url: string): EgressDecision;
}

export function createEgressGuard(policy: EgressPolicy): EgressGuard {
  const rules =
    policy.mode === "allowlist" || policy.mode === "intranet" ? policy.hosts.map(parseRule) : [];

  return {
    check(url: string): EgressDecision {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { allowed: false, reason: "URL invalide" };
      }
      const host = parsed.hostname.toLowerCase();
      const loopback = LOOPBACK_HOSTS.has(host);

      if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
        return { allowed: false, reason: `Protocole refusé : ${parsed.protocol}` };
      }
      if (parsed.username || parsed.password) {
        return { allowed: false, reason: "Identifiants dans l'URL refusés" };
      }
      // En mode intranet, la passerelle réseau juge l'adresse réellement jointe.
      if (policy.mode === "open" || policy.mode === "intranet") {
        return { allowed: true };
      }
      if (policy.mode === "deny-all") {
        return { allowed: false, reason: "Sorties réseau désactivées par la politique" };
      }
      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      if (rules.some((rule) => ruleMatches(rule, host, port))) {
        return { allowed: true };
      }
      return { allowed: false, reason: `Hôte non autorisé : ${host}` };
    },
  };
}

/** fetch qui applique le garde avant tout appel et refuse les redirections hors liste. */
export function createGuardedFetch(
  guard: EgressGuard,
  baseFetch: typeof fetch = fetch,
): (url: string, init?: RequestInit) => Promise<Response> {
  return async (url, init) => {
    const decision = guard.check(url);
    if (!decision.allowed) {
      throw new Error(`Sortie réseau bloquée (${url}) : ${decision.reason}`);
    }
    const response = await baseFetch(url, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const target = new URL(location, url).toString();
      const redirectDecision = guard.check(target);
      if (!redirectDecision.allowed) {
        throw new Error(`Redirection bloquée vers ${target} : ${redirectDecision.reason}`);
      }
    }
    return response;
  };
}
