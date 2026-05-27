import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { verifyCredential, type VerificationResult } from '@signata/verifier';
import { staticRegistry } from '@signata/trust-registry';
import ConnectButton from '../components/ConnectButton.js';
import CredentialResult from '../components/CredentialResult.js';
import MintCard from '../components/MintCard.js';

export default function Import(): React.ReactElement {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string>('');

  const onVerify = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const verified = await verifyCredential(input.trim(), { trustRegistry: staticRegistry });
      setResult(verified);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onClear = () => {
    setInput('');
    setResult(null);
    setError('');
  };

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
          <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
            Step 1 of 2
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
            Import a credential
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Paste an SD-JWT VC. The credential is verified entirely in your browser
            — no data leaves this tab. If the issuer is on the Signata trust
            registry, you&apos;ll be offered the option to project the verified
            outcome as on-chain attestations against your wallet.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent>
            <TextField
              label="SD-JWT VC"
              multiline
              minRows={6}
              maxRows={14}
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="eyJ0eXAiOiJkYytzZC1qd3QiLCJraWQi…"
              slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={onVerify}
                disabled={busy || !input.trim()}
              >
                {busy ? 'Verifying…' : 'Verify credential'}
              </Button>
              <Button onClick={onClear} disabled={busy}>
                Clear
              </Button>
            </Stack>
            {busy && <LinearProgress sx={{ mt: 2 }} />}
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {result && (
          <>
            <CredentialResult result={result} />
            {result.valid && (
              <>
                <Box>
                  <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
                    Step 2 of 2
                  </Typography>
                </Box>
                <MintCard credential={result} />
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
