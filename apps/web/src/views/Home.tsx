import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';
import ConnectButton from '../components/ConnectButton.js';

export default function Home(): React.ReactElement {
  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 8 }}>
      <Stack spacing={3}>
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <ConnectButton />
        </Stack>

        <Box>
          <Chip label="In development" size="small" variant="outlined" sx={{ mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Signata Bridge
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Bring a verifiable credential on-chain as an EAS attestation against
            your wallet — without putting any of the underlying data on a chain.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              How it works
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Box>
                <strong>1.</strong> Paste an SD-JWT VC issued by a trusted provider.
              </Box>
              <Box>
                <strong>2.</strong> Your browser verifies the issuer signature, applies
                the trust registry, and shows the disclosed claims. Nothing leaves the
                tab.
              </Box>
              <Box>
                <strong>3.</strong> Choose which claims to project on-chain. A small
                EAS attestation is minted against your wallet, carrying the verified
                outcome — never the underlying credential.
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <Button
            component={RouterLink}
            to="/import"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
          >
            Import a credential
          </Button>
          <Button component={RouterLink} to="/attestations" variant="outlined" size="large">
            View my attestations
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
