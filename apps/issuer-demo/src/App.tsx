import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  CssBaseline,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { CREDENTIAL_TYPES, issueCredential, type CredentialDefinition } from './issuer.js';
import { ISSUER_DID } from './demoKey.js';

const theme = createTheme({ palette: { mode: 'light' } });

interface IssuedState {
  def: CredentialDefinition;
  credential: string;
}

export default function App(): React.ReactElement {
  const [issued, setIssued] = useState<IssuedState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const onIssue = async (def: CredentialDefinition) => {
    try {
      setError('');
      setBusy(def.id);
      const credential = await issueCredential(def);
      setIssued({ def, credential });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const onCopy = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.credential);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ pt: 6, pb: 8 }}>
        <Stack spacing={3}>
          <Alert severity="warning">
            <AlertTitle>Demo issuer — not for production</AlertTitle>
            Credentials issued here are signed by a keypair that is committed in source
            and therefore publicly known. The issuer&apos;s DID
            (<code>{ISSUER_DID}</code>) is listed in the Signata trust registry only
            with accreditation level <code>demo</code>. Consumers must not treat these
            credentials as real-world identity proofs.
          </Alert>

          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Demo Government Issuer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Generic mock issuer. Generates SD-JWT VCs with selectively disclosable
              fields, structurally identical to what a real-world digital identity
              wallet would produce.
            </Typography>
          </Box>

          <Stack spacing={2}>
            {CREDENTIAL_TYPES.map((def) => (
              <Card key={def.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {def.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {def.description}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                    vct: {def.vct} · disclosable: {def.disclosureKeys.join(', ')}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => onIssue(def)}
                    disabled={busy !== null}
                  >
                    {busy === def.id ? 'Issuing…' : 'Issue credential'}
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {issued && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
                  Credential issued
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {issued.def.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Copy the string below and paste it into the Signata Bridge dApp to
                  verify and project it on-chain.
                </Typography>
                <TextField
                  multiline
                  fullWidth
                  value={issued.credential}
                  slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } } }}
                  minRows={6}
                  maxRows={12}
                  sx={{ mt: 2 }}
                />
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                  onClick={onCopy}
                >
                  {copied ? 'Copied' : 'Copy credential'}
                </Button>
              </CardActions>
            </Card>
          )}
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
