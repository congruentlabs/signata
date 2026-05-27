import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

export const DEFAULT_NETWORK = 'baseSepolia' as const;

/**
 * URL of the Signata Bridge web app. Used for the "Verify via Signata
 * Bridge" deep link. Override via `VITE_BRIDGE_URL` for local dev.
 */
export const BRIDGE_URL = import.meta.env['VITE_BRIDGE_URL'] ?? 'https://signata.xyz';
