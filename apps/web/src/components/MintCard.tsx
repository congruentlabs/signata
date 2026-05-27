import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import {
  bridgeCredential,
  DEFAULT_MAPPERS,
  type BridgeResult,
  type ClaimMapper,
} from '@signata/sdk';
import type { VerificationResult } from '@signata/verifier';
import { DEFAULT_NETWORK } from '../lib/wagmi.js';

interface Props {
  credential: VerificationResult;
}

export default function MintCard({ credential }: Props): React.ReactElement {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [error, setError] = useState<string>('');

  // Run each mapper against the credential to see which schemas would emit.
  const previews = useMemo(() => {
    return DEFAULT_MAPPERS.map((mapper) => ({
      mapper,
      data: mapper.map(credential),
    }));
  }, [credential]);

  const willEmit = previews.filter((p) => p.data !== null);
  const willSkip = previews.filter((p) => p.data === null);

  const onMint = async () => {
    if (!walletClient) {
      setError('No wallet client');
      return;
    }
    try {
      setBusy(true);
      setError('');
      setResult(null);
      const mappers: ClaimMapper[] = willEmit.map((p) => p.mapper);
      const bridgeResult = await bridgeCredential(credential, {
        walletClient,
        network: DEFAULT_NETWORK,
        mappers,
      });
      setResult(bridgeResult);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const wrongChain = isConnected && chainId !== baseSepolia.id;
  const canMint = isConnected && !wrongChain && willEmit.length > 0 && !busy;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
          Project on-chain
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Mint EAS attestations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Each mapper looks at the verified credential and either produces an
          attestation payload or skips. Only the schemas listed below will be
          minted.
        </Typography>

        <Stack spacing={1} sx={{ mt: 2 }}>
          {willEmit.map(({ mapper }) => (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} key={mapper.schema.uid}>
              <Chip label="will mint" color="success" size="small" variant="outlined" />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {mapper.schema.name}
              </Typography>
            </Stack>
          ))}
          {willSkip.map(({ mapper }) => (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} key={mapper.schema.uid}>
              <Chip label="skip" size="small" variant="outlined" />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {mapper.schema.name}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {!isConnected && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Connect a wallet to mint attestations.
          </Alert>
        )}
        {wrongChain && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Switch to Base Sepolia to mint.
          </Alert>
        )}
        {willEmit.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No mapper produced a payload for this credential — nothing to mint.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Minted {result.attestations.length} attestation
            {result.attestations.length === 1 ? '' : 's'}.
            <Stack spacing={0.5} sx={{ mt: 1, fontFamily: 'monospace', fontSize: 12 }}>
              {result.attestations.map((a) => (
                <div key={a.transactionHash}>
                  <strong>{a.schemaName}</strong>
                  <br />
                  tx:{' '}
                  <a
                    href={`https://sepolia.basescan.org/tx/${a.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {a.transactionHash}
                  </a>
                </div>
              ))}
            </Stack>
          </Alert>
        )}
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={onMint} disabled={!canMint}>
          {busy ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
          {busy ? 'Submitting…' : `Mint ${willEmit.length} attestation${willEmit.length === 1 ? '' : 's'}`}
        </Button>
      </CardActions>
    </Card>
  );
}
