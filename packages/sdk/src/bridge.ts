/**
 * `bridgeCredential` — the main write entry point. Takes a verified
 * credential plus a set of claim mappers, runs each mapper against the
 * credential, and submits an EAS attestation transaction for every mapper
 * that produced a value.
 *
 * POC self-attestation pattern: the connected wallet is both attester and
 * recipient. Production deployments will replace this with EAS delegated
 * attestations so Signata can be the attester without ever holding the
 * user's keys — that's a phase 2 change to this function's signature.
 */

import type { VerificationResult } from '@signata/verifier';
import type { Hex } from 'viem';
import { EAS_ABI, EAS_ADDRESSES, ZERO_ADDRESS } from './eas.js';
import { encodeAttestationData } from './encoding.js';
import type { BridgeAttestation, BridgeOptions, BridgeResult } from './types.js';

export async function bridgeCredential(
  credential: VerificationResult,
  options: BridgeOptions,
): Promise<BridgeResult> {
  if (!credential.valid) {
    throw new Error(
      `Cannot bridge an invalid credential (${credential.reason ?? 'unknown reason'})`,
    );
  }
  const account = options.walletClient.account;
  if (!account) {
    throw new Error('walletClient must have a connected account');
  }
  const recipient = options.recipient ?? account.address;
  const easAddress = EAS_ADDRESSES[options.network].eas;

  const attestations: BridgeAttestation[] = [];
  const skipped: BridgeResult['skipped'] = [];

  for (const mapper of options.mappers) {
    const data = mapper.map(credential);
    if (data === null) {
      skipped.push({ schemaName: mapper.schema.name, reason: 'mapper-returned-null' });
      continue;
    }

    const encodedData = encodeAttestationData(mapper.schema.schema, data);
    const expirationTime = (credential.expiresAt ? BigInt(credential.expiresAt) : 0n);

    const txHash = await options.walletClient.writeContract({
      account,
      chain: options.walletClient.chain ?? null,
      address: easAddress,
      abi: EAS_ABI,
      functionName: 'attest',
      args: [
        {
          schema: mapper.schema.uid,
          data: {
            recipient,
            expirationTime,
            revocable: mapper.schema.revocable,
            refUID: ZERO_BYTES32,
            data: encodedData,
            value: 0n,
          },
        },
      ],
    });

    attestations.push({
      schemaUid: mapper.schema.uid,
      schemaName: mapper.schema.name,
      transactionHash: txHash,
      encodedData,
      // The UID is recoverable from the Attested event in the transaction
      // receipt. Callers that need it should fetch the receipt and parse
      // the log themselves; we don't await receipts here to keep the bridge
      // call non-blocking for multi-attestation flows.
    });
  }

  return { attestations, skipped };
}

const ZERO_BYTES32: Hex =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Helper: given a transaction hash from `bridgeCredential`, wait for the
 * receipt and extract the attestation UID from the `Attested` event.
 */
export async function getAttestationUidFromTx(
  publicClient: import('viem').PublicClient,
  txHash: Hex,
): Promise<Hex | undefined> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  for (const log of receipt.logs) {
    // The `Attested` event has signature
    //   Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)
    // The non-indexed `uid` is the first 32 bytes of the data field.
    if (log.data && log.data.length >= 66) {
      return ('0x' + log.data.slice(2, 66)) as Hex;
    }
  }
  return undefined;
}
