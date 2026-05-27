import React from 'react';
import {
  Alert,
  Box,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import AttestationGate from './components/AttestationGate.js';
import GateOverlay from './components/GateOverlay.js';
import Marketplace from './components/Marketplace.js';
import ConnectButton from './components/ConnectButton.js';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3a2a1a' },
  },
  typography: {
    h3: { letterSpacing: -0.5 },
    h4: { letterSpacing: -0.3 },
  },
});

export default function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AttestationGate>
        {(ctx) => (
          <>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                position: 'sticky',
                top: 0,
                zIndex: 5,
              }}
            >
              <Container maxWidth="lg">
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Spirits Cellar
                  </Typography>
                  <ConnectButton />
                </Stack>
              </Container>
            </Box>

            <Container maxWidth="lg" sx={{ pt: 4, pb: 8 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                This is a Signata Bridge demo — a sample of what an age-gated dApp can
                look like when it accepts a verified-credential attestation in place
                of a self-declared birthdate. No real spirits are being sold and no
                payments are being taken.
              </Alert>

              <Marketplace blurred={ctx.status !== 'allowed'} />
            </Container>

            <GateOverlay ctx={ctx} />
          </>
        )}
      </AttestationGate>
    </ThemeProvider>
  );
}
