import React from 'react';
import { Box, Container, CssBaseline, Stack, ThemeProvider, Typography, createTheme } from '@mui/material';

const theme = createTheme({ palette: { mode: 'light' } });

export default function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ pt: 8, pb: 8 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
              Under development
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
              Signata Bridge
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mt: 2 }}>
              The dApp that lets you bring a verifiable credential on-chain as an
              EAS attestation against your wallet — without putting any of the
              underlying data on a chain.
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Importing, viewing, and revoking attestations will land here as the
            underlying packages mature. The verifier and SDK packages are the
            current focus.
          </Typography>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
