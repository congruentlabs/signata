import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Bridge dApp wagmi config. We support both Base mainnet and Base Sepolia
 * (the dev chain for testing before schemas are registered on mainnet).
 *
 * Only an `injected()` connector for now — covers MetaMask, Rabby, Brave,
 * Coinbase Wallet extension, etc. WalletConnect is intentionally deferred.
 */
export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

export const DEFAULT_NETWORK = 'baseSepolia' as const;
