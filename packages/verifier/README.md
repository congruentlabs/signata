# @signata/verifier

Browser-safe verifier for verifiable digital credentials.

## What it does

Takes a credential string (SD-JWT VC, W3C JWT-VC), validates the issuer's
signature against the issuer's resolvable DID document, applies a trust
registry to decide if the issuer is accredited, checks the validity window,
and returns the holder-disclosed claims.

Runs in any modern browser. No backend required.

## What it doesn't do

- Doesn't store credentials. The caller owns lifecycle.
- Doesn't talk to any chain. The on-chain projection belongs in `@signata/sdk`.
- Doesn't issue credentials. See `apps/issuer-demo` for a development-only mock issuer.
- Doesn't implement ZK proofs over credentials. Selective disclosure uses
  SD-JWT VC's native disclosures, which the issuer must support at issuance time.

## Usage

```ts
import { verifyCredential } from '@signata/verifier';

const result = await verifyCredential(credentialString, {
  trustRegistry: myRegistry,
});

if (result.valid) {
  console.log('Issued by', result.issuerDid);
  console.log('Disclosed claims', result.disclosedClaims);
} else {
  console.warn('Invalid:', result.reason);
}
```

## Supported formats

| Format | Status |
| --- | --- |
| SD-JWT VC | In progress (primary) |
| W3C JWT-VC | Planned |
| ISO 18013-5 mDoc | Planned |
| W3C JSON-LD VC | Out of scope unless a specific consumer requires it |

## DID resolution

| Method | Status |
| --- | --- |
| `did:web` | Planned |
| `did:jwk` | Planned |
| `did:key` | Planned |
| `did:ethr` | Future |

## Status

Stub. Public interface stable; implementation in progress.
