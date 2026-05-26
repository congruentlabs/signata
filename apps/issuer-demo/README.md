# @signata/issuer-demo

A development-only mock issuer that produces SD-JWT VCs with
selectively-disclosable fields. Lets the bridge be exercised end-to-end
without a real-world issuer.

## What it is

- A small web app at `issuer-demo.signata.xyz` (planned)
- Issues SD-JWT VCs signed by a development key (DID: `did:web:issuer-demo.signata.xyz`)
- Generic branding — not affiliated with any real government or accreditation body
- Credentials it issues are not valid for any real purpose

## What it is not

- Not a production issuer. The signing key is intentionally publicly known.
- Not affiliated with any real government identity system.
- Not a substitute for any real-world identity verification.

## Status

Skeleton. Issuance logic to follow. The DID document at
`public/.well-known/did.json` is a placeholder and must be regenerated with
a real keypair before any credential issued by this app can be verified.

## Development

```bash
pnpm --filter @signata/issuer-demo dev
```
