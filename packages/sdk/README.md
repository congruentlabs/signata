# @signata/sdk

High-level SDK for bridging verified credentials onto EAS attestations and
reading them back from any consuming application.

Wraps [@signata/verifier](../verifier) for the verification step and the EAS
SDK for the on-chain projection.

## Usage

```ts
import { verifyCredential } from '@signata/verifier';
import { bridgeCredential, findAttestations } from '@signata/sdk';

// 1. Verify a credential (browser, no network beyond DID resolution)
const verified = await verifyCredential(credentialString, { trustRegistry });

// 2. Project the verified outcome onto EAS, against the connected wallet
const result = await bridgeCredential(verified, {
  walletClient,
  mappers: [over18Mapper, jurisdictionMapper],
});

// 3. From any consuming dApp, check whether a wallet holds the attestation
const attestations = await findAttestations({
  recipient: walletAddress,
  schemaUid: SCHEMA_OVER18,
});
```

## Schemas

Canonical EAS schemas this SDK targets. Schema UIDs are exported from the
package once registered on Base mainnet.

| Schema | Fields |
| --- | --- |
| `signata.credential.v1` | `issuerDid`, `credentialType`, `issuedAt`, `expiresAt`, `credentialHash` |
| `signata.claim.over18.v1` | `verified`, `verifiedAt`, `issuerDid`, `jurisdiction` |
| `signata.claim.kyc.v1` | `level`, `verifiedAt`, `issuerDid`, `jurisdiction` |
| `signata.claim.jurisdiction.v1` | `country`, `subdivision`, `verifiedAt`, `issuerDid` |

Schemas are immutable on EAS so we version with `.vN` suffixes from day one.

## Status

Stub. Public interface stable; implementation in progress.
