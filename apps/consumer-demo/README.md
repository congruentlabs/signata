# @signata/consumer-demo

A sample consuming dApp. Gates access on the presence of a Signata-bridged
EAS attestation against the connected wallet. Used to demonstrate the
end-to-end flow.

## What it demonstrates

- Reading an EAS attestation in a wallet's name
- Checking that the issuer (recorded on the attestation) is on the
  configured trust list
- Granting or denying access based on the result — with zero PII passing
  through the consuming app

## Status

Skeleton. Real gating logic arrives once `@signata/sdk` exposes attestation
reads.

## Development

```bash
pnpm --filter @signata/consumer-demo dev
```
