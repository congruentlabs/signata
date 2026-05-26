# @signata/sdk

High-level SDK for bridging verified credentials onto EAS attestations and
reading them back from any consuming application.

Wraps [@signata/verifier](../verifier) for the verification step and exposes
viem-native helpers for the on-chain projection. No `ethers` dependency.

## Usage

```ts
import { verifyCredential } from '@signata/verifier';
import {
  bridgeCredential,
  findAttestations,
  CLAIM_OVER18_V1,
  DEFAULT_MAPPERS,
} from '@signata/sdk';

// 1. Verify a credential (browser, no network beyond DID resolution)
const verified = await verifyCredential(credentialString, { trustRegistry });

// 2. Project the verified outcome onto EAS, against the connected wallet
const result = await bridgeCredential(verified, {
  walletClient,            // viem WalletClient
  network: 'baseSepolia',  // or 'base'
  mappers: DEFAULT_MAPPERS,
});
console.log(result.attestations); // [{ schemaName, transactionHash, ... }]

// 3. From any consuming dApp, check whether a wallet holds the attestation
const found = await findAttestations({
  network: 'base',
  recipient: walletAddress,
  schemaUid: CLAIM_OVER18_V1.uid,
});
if (found.length > 0 && found[0].data.verified) {
  // allow access
}
```

## Schemas

Four canonical schemas ship with the SDK. UIDs are computed deterministically
from `keccak256(packed(schema, resolver, revocable))`, so the SDK can reference
them at compile time, before they've actually been registered on-chain.

| Schema | Fields |
| --- | --- |
| `signata.credential.v1` | `issuerDid`, `credentialType`, `issuedAt`, `expiresAt`, `credentialHash` |
| `signata.claim.over18.v1` | `verified`, `verifiedAt`, `issuerDid`, `jurisdiction` |
| `signata.claim.kyc.v1` | `level`, `verifiedAt`, `issuerDid`, `jurisdiction` |
| `signata.claim.jurisdiction.v1` | `country`, `subdivision`, `verifiedAt`, `issuerDid` |

Schemas are immutable on EAS; versioning lives in the `.vN` suffix.

## Registering the schemas

The SDK ships a script that calls `SchemaRegistry.register` for every
schema. Idempotent — already-registered schemas are skipped. Run once per
network:

```bash
RPC_URL=https://sepolia.base.org \
PRIVATE_KEY=0x... \
NETWORK=baseSepolia \
pnpm --filter @signata/sdk register-schemas

RPC_URL=https://mainnet.base.org \
PRIVATE_KEY=0x... \
NETWORK=base \
pnpm --filter @signata/sdk register-schemas
```

The script prints the resulting UID for each schema; these are the same
deterministic UIDs the SDK exports as `CLAIM_OVER18_V1.uid` etc.

## Built-in claim mappers

A mapper turns a `VerificationResult` into the data payload for one schema.
Return `null` from `map` to opt out (e.g. `over18Mapper` returns null when
the credential has no age claim disclosed).

| Mapper | Schema | Fires when |
| --- | --- | --- |
| `credentialMapper` | `signata.credential.v1` | Always, if the verification result has an issuer + type |
| `over18Mapper` | `signata.claim.over18.v1` | The credential discloses `age_over_18: true` or `age >= 18` |
| `kycMapper` | `signata.claim.kyc.v1` | The credential discloses `kyc_level` (or `kyc_passed: true`) |
| `jurisdictionMapper` | `signata.claim.jurisdiction.v1` | The credential discloses `country` |

Write your own mapper by implementing `ClaimMapper<TData>` and pass it to
`bridgeCredential`.

## Read path

`findAttestations` queries the EAS GraphQL indexer for attestations
matching a `(recipient, schema)` pair, optionally filtered by attester.
`getAttestation` is a direct contract read for a known UID — used as a
verification of the indexer result, or as the read path when the indexer
isn't available.

## Attestation model

For this version of the SDK the connected wallet is **both attester and
recipient** — the user self-attests that they verified the credential.
This is enough to demonstrate the end-to-end architecture but is not
authoritative on its own; a consuming dApp shouldn't trust a
self-attestation alone.

A future version will replace this with EAS *delegated attestations* so a
Signata-controlled signer authorises each attestation, and the user only
submits the transaction. That requires the signer (i.e. a backend
service), which the POC deliberately avoids.

## Status

Implementation complete; pending schema registration on-chain. All tests
green (`pnpm --filter @signata/sdk test`).
