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
Wallet). W3C JWT-VC is also supported. ISO 18013-5 mDoc is planned.
JSON-LD VCs and AnonCreds are out of scope unless a specific consumer
requires them.

## Deployment

Each app deploys to a separate Cloudflare Pages project:

| App | Project name | Custom domain |
| --- | --- | --- |
| `apps/web` | `signata-web` | `signata.xyz` |
| `apps/issuer-demo` | `signata-issuer-demo` | `issuer-demo.signata.xyz` |
| `apps/consumer-demo` | `signata-consumer-demo` | `consumer-demo.signata.xyz` |

### One-off CLI deploys

```bash
npx wrangler login            # first time only

pnpm deploy:web               # builds + publishes apps/web
pnpm deploy:issuer            # builds + publishes apps/issuer-demo
pnpm deploy:consumer          # builds + publishes apps/consumer-demo
pnpm deploy:all               # all three, sequentially
```

The first `deploy:*` for each app will offer to create the Pages project
if it doesn't exist yet.

### Git-integrated deploys (recommended)

In the Cloudflare dashboard, create three Pages projects, each connected
to this repo. Settings per project:

| Setting | `signata-web` | `signata-issuer-demo` | `signata-consumer-demo` |
| --- | --- | --- | --- |
| Framework preset | Vite | Vite | Vite |
| Build command | `pnpm install --frozen-lockfile && pnpm --filter @signata/web build` | `... @signata/issuer-demo build` | `... @signata/consumer-demo build` |
| Build output directory | `apps/web/dist` | `apps/issuer-demo/dist` | `apps/consumer-demo/dist` |
| Root directory | _(blank)_ | _(blank)_ | _(blank)_ |
| Env: `NODE_VERSION` | `20` | `20` | `20` |
| Env: `VITE_BRIDGE_URL` | — | — | `https://signata.xyz` |

Each subsequent push to `main` deploys production; other branches get
preview URLs.

### Cross-origin headers

`apps/issuer-demo/public/_headers` sets `Access-Control-Allow-Origin: *`
on `/.well-known/*` so that any verifier can fetch the DID document
cross-origin. Without this header, `did:web` resolution from the bridge
dApp will fail.

## Licence

MIT — see [LICENSE](LICENSE).
