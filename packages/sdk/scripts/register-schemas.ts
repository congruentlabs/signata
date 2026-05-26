/**
 * Register the canonical Signata schemas on the configured EAS network.
 *
 * Usage (from the repo root):
 *
 *   RPC_URL=https://sepolia.base.org \
 *   PRIVATE_KEY=0x... \
 *   NETWORK=baseSepolia \
 *   pnpm --filter @signata/sdk register-schemas
 *
 * Idempotent. EAS's `register` returns the existing UID if a schema is
 * already registered, so re-running this is safe — every schema's
 * resulting UID is logged regardless.
 */

import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { EAS_ADDRESSES, SCHEMA_REGISTRY_ABI, type SupportedNetwork } from '../src/eas.js';
import { ALL_SCHEMAS } from '../src/schemas.js';

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const NETWORK_CHAINS = {
  base,
  baseSepolia,
} as const;

async function main() {
  const network = (process.env['NETWORK'] ?? 'baseSepolia') as SupportedNetwork;
  if (!(network in NETWORK_CHAINS)) {
    throw new Error(`Unsupported NETWORK '${network}'. Expected one of: ${Object.keys(NETWORK_CHAINS).join(', ')}`);
  }
  const rpcUrl = need('RPC_URL');
  const privateKey = need('PRIVATE_KEY') as Hex;

  const chain = NETWORK_CHAINS[network];
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });
  const registryAddress: Address = EAS_ADDRESSES[network].schemaRegistry;

  console.log(`Registering ${ALL_SCHEMAS.length} schemas on ${network} via ${rpcUrl}`);
  console.log(`Registry: ${registryAddress}`);
  console.log(`From:     ${account.address}`);
  console.log();

  for (const def of ALL_SCHEMAS) {
    console.log(`→ ${def.name}`);
    console.log(`    schema:    ${def.schema}`);
    console.log(`    expectedUid: ${def.uid}`);

    // Check whether it's already registered
    const existing = await publicClient.readContract({
      address: registryAddress,
      abi: SCHEMA_REGISTRY_ABI,
      functionName: 'getSchema',
      args: [def.uid],
    });
    if (existing.uid !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log(`    already registered ✓\n`);
      continue;
    }

    const hash = await walletClient.writeContract({
      address: registryAddress,
      abi: SCHEMA_REGISTRY_ABI,
      functionName: 'register',
      args: [def.schema, def.resolver as Address, def.revocable],
    });
    console.log(`    tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`    confirmed in block ${receipt.blockNumber}\n`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
