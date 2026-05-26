# Architecture

High-level reference for the Signata Bridge codebase.

## Three layers

1. **Verifier** ([`@signata/verifier`](../packages/verifier))
   Takes a credential string and a trust registry; returns a structured
   verification result. Browser-safe. No on-chain dependencies.

2. **SDK** ([`@signata/sdk`](../packages/sdk))
   Wraps the verifier and the EAS SDK. Projects verified credentials onto
   EAS attestations against a wallet, and exposes a read API for consuming
   applications.

3. **Trust registry** ([`@signata/trust-registry`](../packages/trust-registry))
   Static JSON list of accredited issuer DIDs and metadata. Consumed by
   the verifier. Hand-curated; may move on-chain in future.

## Three apps

- **`apps/web`** — the Signata Bridge dApp itself. Imports credentials,
  shows the user their attestations, and lets them revoke.
- **`apps/issuer-demo`** — a development-only mock issuer producing SD-JWT
  VCs with selectively-disclosable fields. Generic branding.
- **`apps/consumer-demo`** — a sample dApp that gates content on the
  presence of a bridged attestation.

## Data flow

```
issuer            holder + verifier             consumer
  │                       │                        │
  │  credential string    │                        │
  ├──────────────────────▶│                        │
  │                       │ (browser-only          │
  │                       │  verification:         │
  │                       │  signature + trust     │
  │                       │  + expiry)             │
  │                       │                        │
  │                       │ EAS attestation tx     │
  │                       ├───────────────────────▶│ EAS contract
  │                       │                        │  (on-chain)
  │                       │                        │
  │                       │                        │ eth_call:
  │                       │                        │ findAttestations
  │                       │                        │ holder, schema
  │                       │                        ▶
```

The on-chain record contains the **outcome** of verification — never the
underlying credential or its raw fields.

## Schemas

EAS schemas this project targets:

| Schema | Purpose |
| --- | --- |
| `signata.credential.v1` | Generic wrapper attesting "holder presented a verified credential of type X from issuer Y at time T". |
| `signata.claim.over18.v1` | Specific claim — useful for age-gated services. |
| `signata.claim.kyc.v1` | KYC level + jurisdiction. |
| `signata.claim.jurisdiction.v1` | Country / subdivision. |

Schemas are immutable on EAS. Versioned with `.vN` suffixes from day one.

## Threat model summary

- **PII confidentiality**: the underlying credential never leaves the
  holder's browser during verification. The on-chain record carries no
  personally identifying fields beyond the issuer reference and the claim
  outcome.
- **Issuer impersonation**: defended by the trust registry — only DIDs
  that resolve to listed entries are considered valid. The verifier never
  trusts an unknown issuer's signature for trust-affecting decisions.
- **Replay**: each attestation includes a hash of the underlying
  credential so a consumer can detect re-use across attestations.
- **Revocation**: the credential's own status-list mechanism handles
  upstream revocation. EAS attestations are independently revocable by
  the original attester.
