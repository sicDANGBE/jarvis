import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { VaultState } from "../../../contracts/vault";
import { useTranslation } from "../../i18n";
import { SettingsGroup, SettingsRow } from "./settings-utils";

/**
 * The vault page (issue #13): names and dates of the user's secrets, never their values; add,
 * replace, search and delete. Values are sent once to the main process and encrypted there.
 */
export function SettingsVaultSection() {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<VaultState | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    window.piApp
      ?.getVault()
      .then((next) => {
        if (active) setState(next);
      })
      .catch((reason: unknown) => setError(String(reason)));
    return () => {
      active = false;
    };
  }, []);

  const secrets = useMemo(() => {
    if (!state?.available) return [];
    const needle = query.trim().toLowerCase();
    return needle
      ? state.secrets.filter((secret) => secret.name.toLowerCase().includes(needle))
      : state.secrets;
  }, [state, query]);

  const run = async (action: () => Promise<VaultState> | undefined) => {
    setError(undefined);
    try {
      const next = await action();
      if (next) setState(next);
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
          : String(reason),
      );
      return false;
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const saved = await run(() => window.piApp?.setVaultSecret(name.trim(), value));
    setSaving(false);
    if (saved) {
      setName("");
      setValue("");
    }
  };

  if (!state) return null;
  if (!state.available) {
    return (
      <SettingsGroup>
        <SettingsRow title={t("vault.unavailable")} description={state.reason} />
      </SettingsGroup>
    );
  }

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <SettingsGroup title={t("vault.secrets")}>
        <div className="settings-row">
          <input
            aria-label={t("vault.search")}
            className="settings-search"
            placeholder={t("vault.search")}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {secrets.length === 0 ? (
          <SettingsRow
            title={state.secrets.length === 0 ? t("vault.empty") : t("vault.noMatch", { query })}
          />
        ) : (
          secrets.map((secret) => (
            <SettingsRow
              key={secret.name}
              title={secret.name}
              description={t("vault.updated", {
                date: dateFormat.format(new Date(secret.updatedAt)),
              })}
            >
              <button
                aria-label={t("vault.delete", { name: secret.name })}
                className="button button--secondary"
                type="button"
                onClick={() => {
                  if (window.confirm(t("vault.confirmDelete", { name: secret.name }))) {
                    run(() => window.piApp?.deleteVaultSecret(secret.name)).catch(console.error);
                  }
                }}
              >
                {t("settings.common.remove")}
              </button>
            </SettingsRow>
          ))
        )}
      </SettingsGroup>

      <SettingsGroup title={t("vault.add")} description={t("vault.addDescription")}>
        <form
          className="settings-row vault-form"
          onSubmit={(event) => {
            onSubmit(event).catch(console.error);
          }}
        >
          <input
            aria-label={t("vault.name")}
            autoComplete="off"
            className="settings-search"
            placeholder={t("vault.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            aria-label={t("vault.value")}
            autoComplete="new-password"
            className="settings-search"
            placeholder={t("vault.value")}
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button
            className="button button--primary"
            disabled={saving || !name.trim() || !value}
            type="submit"
          >
            {t("vault.save")}
          </button>
        </form>
        {error ? (
          <p className="settings-row__description vault-error" role="alert">
            {error}
          </p>
        ) : null}
      </SettingsGroup>
    </>
  );
}
