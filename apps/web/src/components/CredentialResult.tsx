import React from 'react';
import { Alert, AlertTitle, Box, Chip, Stack, Typography } from '@mui/material';
import type { VerificationResult } from '@signata/verifier';

interface Props {
  result: VerificationResult;
}

export default function CredentialResult({ result }: Props): React.ReactElement {
  if (!result.valid) {
    return (
      <Alert severity="error">
        <AlertTitle>Credential not valid</AlertTitle>
        <strong>{result.reason ?? 'unknown'}</strong>: {result.reasonDetail ?? 'No detail provided'}
      </Alert>
    );
  }
  return (
    <Stack spacing={2}>
      <Alert severity="success">
        <AlertTitle>Credential verified</AlertTitle>
        Issued by <code>{result.issuerDid}</code>
        {result.warnings.length > 0 && (
          <Box sx={{ mt: 1, fontSize: 12, color: 'warning.main' }}>
            {result.warnings.map((w, i) => (
              <div key={i}>⚠ {w}</div>
            ))}
          </Box>
        )}
      </Alert>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Disclosed claims
        </Typography>
        <Box sx={{ mt: 0.5, p: 2, borderRadius: 1, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: 13 }}>
          {Object.keys(result.disclosedClaims).length === 0 ? (
            <em>No claims disclosed.</em>
          ) : (
            <Stack spacing={0.5}>
              {Object.entries(result.disclosedClaims).map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ minWidth: 140, color: 'text.secondary' }}>{k}</Box>
                  <Box>{formatValue(v)}</Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip
          label={`type: ${result.credentialType}`}
          size="small"
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
        {result.expiresAt && (
          <Chip
            label={`expires: ${new Date(result.expiresAt * 1000).toISOString().slice(0, 10)}`}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>
    </Stack>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
