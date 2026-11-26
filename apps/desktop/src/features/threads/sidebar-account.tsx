import { useEffect, useState } from "react";

import type { DesktopUser } from "../../../contracts/user";
import { useTranslation } from "../../i18n";
import { SettingsIcon } from "../../ui/icons";

/**
 * The user block at the bottom of the sidebar (issue #25): avatar, first name, plan or quota,
 * and the way into Settings.
 */
export function SidebarAccount({ onOpenSettings }: { readonly onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<DesktopUser | undefined>();

  useEffect(() => {
    let active = true;
    const request = window.piApp?.getCurrentUser?.();
    request
      ?.then((value) => {
        if (active) setUser(value);
      })
      .catch((error: unknown) => console.error("[renderer] getCurrentUser failed", error));
    return () => {
      active = false;
    };
  }, []);

  const name = user?.displayName ?? t("account.guest");
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="sidebar-account" data-testid="sidebar-account">
      <button
        type="button"
        className="sidebar-account__identity"
        aria-label={t("account.label", { name })}
        onClick={onOpenSettings}
      >
        <span className="sidebar-account__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="sidebar-account__name" data-testid="sidebar-account-name">
          {name}
        </span>
        {user?.plan || user?.isAdmin ? (
          <span className="sidebar-account__plan" data-testid="sidebar-account-plan">
            {user.plan ?? t("account.admin")}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="sidebar-account__settings"
        aria-label={t("account.settings")}
        title={t("account.settings")}
        onClick={onOpenSettings}
      >
        <SettingsIcon />
      </button>
    </div>
  );
}
