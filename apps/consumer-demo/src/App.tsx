import React from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';

const theme = createTheme({ palette: { mode: 'light' } });

export default function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ pt: 8, pb: 8 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
              Sample consumer
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
              Age-gated demo
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mt: 2 }}>
              An example of a dApp that grants access only to wallets holding a
              valid Signata-bridged attestation. None of the user&apos;s personal
              information is requested or stored here.
            </Typography>
          </Box>
          <Alert severity="info">
            Attestation gate not yet wired. Once <code>@signata/sdk</code> can
            verify attestations on-chain, this page will surface either the gated
            content or a link to the Signata Bridge dApp to acquire the
            attestation.
          </Alert>
          <Button
            variant="contained"
            size="large"
            disabled
            onClick={() => undefined}
          >
            Verify via Signata Bridge
          </Button>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
