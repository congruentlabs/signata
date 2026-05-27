import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import {
  ALL_SCHEMAS,
  findAttestations,
  revokeAttestation,
  type AttestationRecord,
  type SchemaDefinition,
} from '@signata/sdk';
import ConnectButton from '../components/ConnectButton.js';
import { DEFAULT_NETWORK } from '../lib/wagmi.js';

function explorerTx(hash: string): string {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

function explorerAttestation(uid: string): string {
  return `https://base-sepolia.easscan.org/attestation/view/${uid}`;
}

interface SchemaSectionProps {
  schema: SchemaDefinition;
  records: AttestationRecord[];
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
}

function SchemaSection({ schema, records, isLoading, error }: SchemaSectionProps): React.ReactElement {
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string>('');

  const onRevoke = async (uid: string) => {
    if (!walletClient) return;
    try {
      setRevoking(uid);
      setRevokeError('');
      await revokeAttestation({
        walletClient,
        network: DEFAULT_NETWORK,
        schemaUid: schema.uid,
        uid: uid as `0x${string}`,
      });
      // Optimistically refetch
      await queryClient.invalidateQueries({ queryKey: ['attestations', schema.uid] });
    } catch (err) {
      console.error(err);
      setRevokeError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          {schema.name}
        </Typography>
        <Chip label={`${records.length} record${records.length === 1 ? '' : 's'}`} size="small" variant="outlined" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {schema.description}
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={14} /> <Typography variant="caption">Querying…</Typography>
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error.message}
        </Alert>
      )}
      {revokeError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setRevokeError('')}>
          {revokeError}
        </Alert>
      )}

      {!isLoading && records.length === 0 && !error && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No attestations against your wallet for this schema.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {records.map((record) => {
          const expired =
            record.expirationTime > 0n && Number(record.expirationTime) * 1000 < Date.now();
          return (
            <Card key={record.uid} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }} useFlexGap>
                  {record.revoked && <Chip label="Revoked" color="error" size="small" />}
                  {expired && !record.revoked && <Chip label="Expired" color="warning" size="small" />}
                  {!record.revoked && !expired && (
                    <Chip label="Valid" color="success" size="small" variant="outlined" />
                  )}
                  <Chip
                    label={`issued ${new Date(Number(record.time) * 1000).toISOString().slice(0, 10)}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  <Box sx={{ color: 'text.secondary' }}>uid</Box>
                  <Box sx={{ wordBreak: 'break-all', mb: 1 }}>{record.uid}</Box>
                  <Box sx={{ color: 'text.secondary' }}>data</Box>
                  <Box>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {formatData(record.data)}
                    </pre>
                  </Box>
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  component="a"
                  href={explorerAttestation(record.uid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon />}
                >
                  View on EASScan
                </Button>
                {!record.revoked && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onRevoke(record.uid)}
                    disabled={revoking !== null}
                  >
                    {revoking === record.uid ? 'Revoking…' : 'Revoke'}
                  </Button>
                )}
              </CardActions>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}

function formatData(data: unknown): string {
  return JSON.stringify(
    data,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );
}

export default function Attestations(): React.ReactElement {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongChain = isConnected && chainId !== baseSepolia.id;

  // One query per schema, in parallel
  const results = useQueries({
    queries: ALL_SCHEMAS.map((schema) => ({
      queryKey: ['attestations', schema.uid, address] as const,
      queryFn: async () => {
        if (!address) return [] as AttestationRecord[];
        return findAttestations({
          network: DEFAULT_NETWORK,
          recipient: address,
          schemaUid: schema.uid,
          attester: address,
        });
      },
      enabled: Boolean(address) && !wrongChain,
    })),
  });

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 8 }}>
      <Stack spacing={3}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Button component={RouterLink} to="/" size="small">
            ← Home
          </Button>
          <ConnectButton />
        </Stack>

        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Your attestations
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Attestations you&apos;ve minted against this wallet via the bridge, grouped by
            schema. Revocation can only be performed by the original attester — for
            the POC self-attestation pattern, that&apos;s the connected wallet.
          </Typography>
        </Box>

        {!isConnected && (
          <Alert severity="info">
            <AlertTitle>Connect a wallet</AlertTitle>
            Use the button at the top right.
          </Alert>
        )}
        {wrongChain && (
          <Alert severity="warning">
            <AlertTitle>Switch network</AlertTitle>
            Attestations live on Base Sepolia for the POC.
          </Alert>
        )}

        {isConnected && !wrongChain && (
          <Stack spacing={4}>
            {ALL_SCHEMAS.map((schema, idx) => {
              const q = results[idx];
              if (!q) return null;
              return (
                <SchemaSection
                  key={schema.uid}
                  schema={schema}
                  records={(q.data ?? []) as AttestationRecord[]}
                  isLoading={q.isLoading}
                  error={q.error as Error | null}
                  onRefetch={() => q.refetch()}
                />
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
