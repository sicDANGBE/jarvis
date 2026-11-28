/**
 * Coffre-fort de Jarvis côté process main (issue #13, décision D5).
 *
 * Ouvre à la demande le coffre `<userData>/vault.json`, chiffré par `safeStorage` (trousseau du
 * système). Sans trousseau sécurisé, le coffre reste fermé et la raison est donnée à l'interface.
 * Les valeurs ne quittent jamais le process main : l'interface ne reçoit que les noms et dates.
 */
import { join } from "node:path";

import type { VaultState } from "../../contracts/vault";
import {
  createSafeStorageCipher,
  SecretVault,
  type SafeStorageLike,
  type SecretCipher,
} from "./secret-vault";

/** Chiffrement factice, réservé aux tests automatisés d'une application non packagée. */
const TEST_ONLY_CIPHER: SecretCipher = {
  encrypt: (plain) => Buffer.from([...Buffer.from(plain)].map((byte) => byte ^ 0x5a)),
  decrypt: (data) => Buffer.from([...data].map((byte) => byte ^ 0x5a)).toString(),
};

export class VaultService {
  private vault: SecretVault | undefined;
  private failure: string | undefined;
  private opening: Promise<void> | undefined;

  constructor(
    private readonly options: {
      readonly userDataDir: string;
      readonly safeStorage: () => SafeStorageLike;
      /** Vrai seulement pour les tests d'une application non packagée. */
      readonly useTestCipher: boolean;
    },
  ) {}

  private async open(): Promise<void> {
    if (this.vault) return;
    this.opening ??= (async () => {
      try {
        const cipher = this.options.useTestCipher
          ? TEST_ONLY_CIPHER
          : createSafeStorageCipher(this.options.safeStorage());
        const vault = new SecretVault(join(this.options.userDataDir, "vault.json"), cipher);
        await vault.load();
        this.vault = vault;
        this.failure = undefined;
      } catch (error) {
        this.failure = error instanceof Error ? error.message : String(error);
      } finally {
        this.opening = undefined;
      }
    })();
    await this.opening;
  }

  async state(): Promise<VaultState> {
    await this.open();
    if (!this.vault) return { available: false, reason: this.failure ?? "Coffre indisponible." };
    return { available: true, secrets: this.vault.list() };
  }

  async set(name: string, value: string): Promise<VaultState> {
    await this.open();
    if (!this.vault) throw new Error(this.failure ?? "Coffre indisponible.");
    await this.vault.set(name, value);
    return this.state();
  }

  async delete(name: string): Promise<VaultState> {
    await this.open();
    if (!this.vault) throw new Error(this.failure ?? "Coffre indisponible.");
    await this.vault.delete(name);
    return this.state();
  }

  /** Pour les outils (issue #14) : le coffre ouvert, ou undefined. */
  async opened(): Promise<SecretVault | undefined> {
    await this.open();
    return this.vault;
  }
}
