# @signata/trust-registry

Accredited issuer list consumed by `@signata/verifier`.

## Contents

Currently a single development entry — the local mock issuer at
`did:web:issuer-demo.signata.xyz`. Real entries will be added one at a time
as accredited issuers agree to be listed.

## Adding an issuer

Append to `src/registry.json`:

```json
{
  "issuerDid": "did:web:<issuer-host>",
  "displayName": "Human-readable issuer name",
  "jurisdiction": "AU",
  "accreditationLevel": "...",
  "validFrom": "YYYY-MM-DD",
  "validUntil": "YYYY-MM-DD",
  "contactUrl": "https://..."
}
```

Entries are intentionally explicit. The intent is that anyone reading the
list can independently verify any entry by visiting the issuer's DID
document and confirming the metadata.

## Usage

```ts
import { staticRegistry } from '@signata/trust-registry';
import { verifyCredential } from '@signata/verifier';

const result = await verifyCredential(credentialString, {
  trustRegistry: staticRegistry,
});
```

## Status

Initial scaffold. Plan is for the registry to remain a static, hand-curated
JSON file for the foreseeable future; an on-chain registry contract may be
introduced later for decentralised governance.
