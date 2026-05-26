import React from 'react';
import {
  Alert,
  AlertTitle,
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
      <Container maxWidth="sm" sx={{ pt: 8, pb: 8 }}>
        <Stack spacing={3}>
          <Alert severity="warning">
            <AlertTitle>Demo issuer</AlertTitle>
            This issuer is for development and testing only. Credentials it issues
            are signed by a publicly-known key and have no real-world significance.
          </Alert>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Demo Government Issuer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Generic mock issuer. Generates SD-JWT VCs with selectively
              disclosable fields for testing the Signata Bridge end-to-end.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => alert('Credential issuance not yet implemented.')}
          >
            Issue test credential
          </Button>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
