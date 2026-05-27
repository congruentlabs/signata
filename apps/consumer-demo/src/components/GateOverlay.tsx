import React from 'react';
import { Alert, AlertTitle, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { BRIDGE_URL } from '../lib/wagmi.js';
import type { GateContext } from './AttestationGate.js';

interface Props {
  ctx: GateContext;
}

/**
 * The full-page overlay shown when access is not yet granted. Tells the
 * user exactly what's needed and deep-links them to the Signata Bridge
 * dApp's import flow.
 */
export default function GateOverlay({ ctx }: Props): React.ReactElement | null {
  if (ctx.status === 'allowed') return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(245, 245, 245, 0.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        p: 2,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <VerifiedUserIcon color="primary" />
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
              Age verification required
            </Typography>
          </Stack>

          {ctx.status === 'no-wallet' && (
            <>
              <Typography variant="h6" gutterBottom>
                Connect a wallet to continue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This site is accessible to anyone holding a Signata Bridge attestation
                that they are 18 or older. Connect a wallet — using the button at the
                top right — to check whether you already hold one.
              </Typography>
            </>
          )}

          {ctx.status === 'wrong-chain' && (
            <>
              <Typography variant="h6" gutterBottom>
                Switch network to Base Sepolia
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The demo lives on Base Sepolia. Use the button at the top right to
                switch.
              </Typography>
            </>
          )}

          {ctx.status === 'pending' && (
            <>
              <Typography variant="h6" gutterBottom>
                Checking your attestations…
              </Typography>
              <Typography variant="body2" color="text.secondary">
                One moment — querying EAS for an over-18 attestation against your
                wallet.
              </Typography>
            </>
          )}

          {ctx.status === 'error' && (
            <>
              <Typography variant="h6" gutterBottom>
                Couldn&apos;t check attestations
              </Typography>
              <Alert severity="error" sx={{ mt: 1 }}>
                <AlertTitle>Lookup failed</AlertTitle>
                {ctx.error}
              </Alert>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                sx={{ mt: 2 }}
                onClick={ctx.refetch}
              >
                Retry
              </Button>
            </>
          )}

          {ctx.status === 'no-attestation' && (
            <>
              <Typography variant="h6" gutterBottom>
                No over-18 attestation found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verify through Signata Bridge to get a privacy-preserving attestation
                on-chain. The bridge accepts a credential from a trusted issuer,
                verifies it client-side, and mints an EAS attestation against your
                wallet — without putting any of the underlying data on a chain.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  component="a"
                  href={`${BRIDGE_URL}/#/import`}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon />}
                >
                  Verify via Signata Bridge
                </Button>
                <Button onClick={ctx.refetch} startIcon={<RefreshIcon />}>
                  I&apos;ve verified
                </Button>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
