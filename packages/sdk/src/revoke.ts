/**
 * Revoke an EAS attestation that the caller previously made.
 *
 * EAS revocation can only be performed by the original attester. For the
 * POC self-attestation pattern that means the wallet that minted the
 * attestation must also call revoke. When a future version of the SDK
 * supports delegated attestations, this will accept either a direct revoke
 * by the original attester or a delegated revoke signed by them.
 */

import type { Hex } from 'viem';
import { EAS_ABI, EAS_ADDRESSES } from './eas.js';
import type { RevokeOptions } from './types.js';

export async function revokeAttestation(options: RevokeOptions): Promise<{ transactionHash: Hex }> {
  const { walletClient, network, schemaUid, uid } = options;
  const account = walletClient.account;
  if (!account) {
    throw new Error('walletClient must have a connected account');
  }
  const easAddress = EAS_ADDRESSES[network].eas;

  const transactionHash = await walletClient.writeContract({
    account,
    chain: walletClient.chain ?? null,
    address: easAddress,
    abi: EAS_ABI,
    functionName: 'revoke',
    args: [
      {
        schema: schemaUid,
        data: {
          uid,
          value: 0n,
        },
      },
    ],
  });

  return { transactionHash };
}
