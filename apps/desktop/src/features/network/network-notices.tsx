import { useEffect, useState } from "react";

import type { NetworkActivityEvent } from "../../../contracts/network";
import { useTranslation } from "../../i18n";

const ALLOWED_VISIBLE_MS = 6_000;
const BLOCKED_VISIBLE_MS = 12_000;

interface NetworkNotice {
  readonly key: string;
  readonly event: NetworkActivityEvent;
  readonly count: number;
}

/**
 * Tells the user about every network access attempt the main process reports (allowed or
 * blocked). Repeated attempts to the same host collapse into one notice with a counter.
 */
export function NetworkNotices() {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<readonly NetworkNotice[]>([]);

  useEffect(() => {
    const api = window.piApp;
    if (!api?.onNetworkActivity) return undefined;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const dismissLater = (key: string, allowed: boolean) => {
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(
          () => {
            timers.delete(key);
            setNotices((current) => current.filter((notice) => notice.key !== key));
          },
          allowed ? ALLOWED_VISIBLE_MS : BLOCKED_VISIBLE_MS,
        ),
      );
    };
    const remove = api.onNetworkActivity((event) => {
      const key = `${event.allowed ? "ok" : "blocked"}:${event.host}`;
      setNotices((current) => {
        const existing = current.find((notice) => notice.key === key);
        if (existing) {
          return current.map((notice) =>
            notice.key === key ? { key, event, count: notice.count + 1 } : notice,
          );
        }
        return [...current, { key, event, count: 1 }].slice(-5);
      });
      dismissLater(key, event.allowed);
    });
    return () => {
      remove();
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className="network-notices"
      data-testid="network-notices"
      role="status"
      aria-label={t("network.region")}
    >
      {notices.map(({ key, event, count }) => (
        <div
          className="network-notice"
          data-allowed={event.allowed ? "true" : "false"}
          data-testid="network-notice"
          key={key}
        >
          <span className="network-notice__title">
            {event.allowed
              ? t("network.allowed", { host: event.host })
              : t("network.blocked", { host: event.host })}
          </span>
          <span className="network-notice__reason">
            {event.reason}
            {count > 1 ? ` · ${t("network.repeated", { count })}` : ""}
          </span>
          <button
            type="button"
            className="network-notice__dismiss"
            aria-label={t("network.dismiss")}
            onClick={() => setNotices((current) => current.filter((notice) => notice.key !== key))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
