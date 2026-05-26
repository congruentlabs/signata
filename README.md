# Signata Bridge

A bridge between verifiable digital credentials and on-chain attestations.

Holders of a verifiable credential (SD-JWT VC, W3C VC, ISO 18013-5 mDoc)
can verify it in the browser and project the verified outcome — and only
the outcome — as an EAS attestation against their wallet address.
Consuming applications then verify eligibility with a single on-chain read.

No personally identifiable information ever touches a chain. Selective
disclosure (e.g. "over 18 without revealing date of birth") is preserved
end-to-end where the source credential supports it.

## Status

Early development. The verifier and on-chain projection layers are being
built first; the consumer-demo and issuer-demo apps follow. Not yet
production-ready — see the demo issuer in `apps/issuer-demo` for the
development loop.

## Architecture

```
issuer (credential)
   │
   ▼
@signata/verifier   ── in-browser, no backend
   │
   ▼  verified claims
@signata/sdk        ── projects to EAS attestation
   │
   ▼
EAS attestation against holder's wallet
   │
   ▼
consuming application (web3 dApp, IAM extension, etc.)
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository layout

```
.
├── apps/
│   ├── web/             the Signata Bridge dApp
│   ├── issuer-demo/     a development-only mock issuer
│   └── consumer-demo/   a sample consuming dApp
├── packages/
│   ├── verifier/        @signata/verifier
│   ├── sdk/             @signata/sdk
│   └── trust-registry/  @signata/trust-registry
└── docs/                architecture notes
```

## Development

Requires Node 20+ and pnpm 9+.

```bash
pnpm install
pnpm build         # build all packages
pnpm dev           # run all apps in dev mode
```

Per-app:

```bash
pnpm --filter @signata/web dev
pnpm --filter @signata/issuer-demo dev
pnpm --filter @signata/consumer-demo dev
```

## Credential formats

Current focus is SD-JWT VC (the format adopted by the EU Digital Identity
Wallet). W3C JWT-VC and ISO 18013-5 mDoc are planned. JSON-LD VCs and
AnonCreds are out of scope unless a specific consumer requires them.

## Licence

MIT — see [LICENSE](LICENSE).
