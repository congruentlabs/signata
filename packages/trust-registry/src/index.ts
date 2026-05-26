/**
 * @signata/trust-registry
 *
 * Static accredited-issuer list. Self-contained — defines its own
 * `RegistryEntry` shape and `Registry` interface. The exported
 * `staticRegistry` is structurally compatible with the `TrustRegistry`
 * interface `@signata/verifier` consumes, so it can be passed directly to
 * the verifier without an explicit cross-package type dependency.
 */

import registryJson from './registry.json' with { type: 'json' };

export interface RegistryEntry {
  issuerDid: string;
  displayName: string;
  jurisdiction?: string;
  accreditationLevel?: string;
  validFrom?: string;
  validUntil?: string;
  contactUrl?: string;
}

export interface IsTrustedOptions {
  jurisdiction?: string;
  now?: Date;
}

export interface Registry {
  isTrusted(issuerDid: string, opts?: IsTrustedOptions): boolean;
  describe(issuerDid: string): RegistryEntry | undefined;
  listEntries(): RegistryEntry[];
}

const entries: RegistryEntry[] = (registryJson.entries as RegistryEntry[]) ?? [];
const byDid = new Map<string, RegistryEntry>(entries.map((entry) => [entry.issuerDid, entry]));

function isWithinValidity(entry: RegistryEntry, now: Date): boolean {
  if (entry.validFrom && new Date(entry.validFrom) > now) return false;
  if (entry.validUntil && new Date(entry.validUntil) < now) return false;
  return true;
}

export const staticRegistry: Registry = {
  isTrusted(issuerDid: string, opts: IsTrustedOptions = {}): boolean {
    const entry = byDid.get(issuerDid);
    if (!entry) return false;
    const now = opts.now ?? new Date();
    if (!isWithinValidity(entry, now)) return false;
    if (opts.jurisdiction && entry.jurisdiction && entry.jurisdiction !== opts.jurisdiction) {
      return false;
    }
    return true;
  },
  describe(issuerDid: string): RegistryEntry | undefined {
    return byDid.get(issuerDid);
  },
  listEntries(): RegistryEntry[] {
    return entries.slice();
  },
};

/**
 * Convenience export. Equivalent to `staticRegistry.listEntries()`.
 */
export function listEntries(): RegistryEntry[] {
  return entries.slice();
}
