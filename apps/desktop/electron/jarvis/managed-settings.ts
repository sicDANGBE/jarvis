/**
 * Réglages administrés de Jarvis (issue #41, décision D15).
 *
 * Chaque réglage a une valeur par défaut propre à Jarvis. La configuration de l'agence peut, pour
 * chaque réglage, fixer une valeur, une valeur par défaut, et le verrouiller. Résolution :
 *
 *   1. verrouillé par l'agence  → valeur de l'agence (sinon son défaut) ;
 *   2. choix de l'utilisateur   → si le réglage n'est pas verrouillé ;
 *   3. défaut de l'agence       → `default`, sinon `value` ;
 *   4. défaut de Jarvis.
 *
 * Les choix de l'utilisateur sont enregistrés dans `<userData>/jarvis-settings.json`.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";

import type { ManagedSettingSource, ManagedSettingView } from "../../contracts/managed-settings";

type SettingValue = boolean | string | readonly string[];

interface SettingDefinition {
  readonly type: "boolean" | "string" | "string-list";
  readonly jarvisDefault: SettingValue;
}

/** Réglages connus. Toute nouvelle clé s'ajoute ici avec son type et son défaut. */
export const SETTING_DEFINITIONS = {
  /** Accès à Internet (D16). L'intranet reste joignable dans tous les cas. */
  "network.internet": { type: "boolean", jarvisDefault: false },
  /** Envoi des traces des requêtes Internet au serveur de traces (D16). */
  "traces.internet.upload": { type: "boolean", jarvisDefault: false },
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;

/** Réglage tel que fourni par la configuration de l'agence. */
export interface AgencySetting {
  readonly value?: SettingValue;
  readonly default?: SettingValue;
  readonly locked?: boolean;
}

export type AgencySettings = Readonly<Record<string, AgencySetting>>;

export function isSettingKey(key: string): key is SettingKey {
  return Object.hasOwn(SETTING_DEFINITIONS, key);
}

const DEFINITIONS: Readonly<Record<SettingKey, SettingDefinition>> = SETTING_DEFINITIONS;

export function isValidSettingValue(key: SettingKey, value: unknown): value is SettingValue {
  switch (DEFINITIONS[key].type) {
    case "boolean":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "string-list":
      return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
}

/** Valide le bloc `settings` de la configuration ; une clé inconnue ou mal typée est refusée. */
export function parseAgencySettings(raw: unknown): AgencySettings {
  if (raw === undefined) return {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("settings doit être un objet");
  }
  const result: Record<string, AgencySetting> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSettingKey(key)) throw new Error(`settings.${key} : réglage inconnu`);
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`settings.${key} doit être un objet { value, default, locked }`);
    }
    const { value, default: def, locked } = entry as Record<string, unknown>;
    if (value !== undefined && !isValidSettingValue(key, value)) {
      throw new Error(`settings.${key}.value n'a pas le bon type`);
    }
    if (def !== undefined && !isValidSettingValue(key, def)) {
      throw new Error(`settings.${key}.default n'a pas le bon type`);
    }
    if (locked !== undefined && typeof locked !== "boolean") {
      throw new Error(`settings.${key}.locked doit être un booléen`);
    }
    result[key] = {
      ...(value !== undefined ? { value } : {}),
      ...(def !== undefined ? { default: def } : {}),
      ...(locked !== undefined ? { locked } : {}),
    };
  }
  return result;
}

export interface ResolvedSetting {
  readonly value: SettingValue;
  readonly source: ManagedSettingSource;
  readonly locked: boolean;
}

export function resolveSetting(
  key: SettingKey,
  agency: AgencySetting | undefined,
  user: SettingValue | undefined,
): ResolvedSetting {
  const locked = agency?.locked === true;
  const agencyValue = agency?.value ?? agency?.default;
  if (locked && agencyValue !== undefined) {
    return { value: agencyValue, source: "agency", locked: true };
  }
  if (!locked && user !== undefined) return { value: user, source: "user", locked: false };
  const agencyDefault = agency?.default ?? agency?.value;
  if (agencyDefault !== undefined) return { value: agencyDefault, source: "agency", locked };
  return { value: DEFINITIONS[key].jarvisDefault, source: "jarvis", locked };
}

export class ManagedSettings {
  private userValues: Record<string, SettingValue>;

  constructor(
    private readonly agency: AgencySettings,
    private readonly userFile: string,
    private readonly onChange: (key: SettingKey) => void = () => {},
  ) {
    this.userValues = readUserValues(userFile);
  }

  get(key: SettingKey): ResolvedSetting {
    return resolveSetting(key, this.agency[key], this.userValues[key]);
  }

  getBoolean(key: SettingKey): boolean {
    return this.get(key).value === true;
  }

  list(): readonly ManagedSettingView[] {
    return (Object.keys(SETTING_DEFINITIONS) as SettingKey[]).map((key) => ({
      key,
      ...this.get(key),
    }));
  }

  /** Enregistre le choix de l'utilisateur ; refusé si le réglage est verrouillé ou mal typé. */
  set(key: string, value: unknown): ResolvedSetting {
    if (!isSettingKey(key)) throw new Error(`Réglage inconnu : ${key}`);
    if (this.agency[key]?.locked === true) {
      throw new Error(`Le réglage ${key} est verrouillé par l'agence.`);
    }
    if (!isValidSettingValue(key, value)) throw new Error(`Valeur invalide pour ${key}.`);
    this.userValues = { ...this.userValues, [key]: value };
    writeUserValues(this.userFile, this.userValues);
    this.onChange(key);
    return this.get(key);
  }
}

function readUserValues(path: string): Record<string, SettingValue> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const values: Record<string, SettingValue> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isSettingKey(key) && isValidSettingValue(key, value)) values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}

function writeUserValues(path: string, values: Record<string, SettingValue>): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(values, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}
