import React from 'react';
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { PRODUCTS } from '../products.js';

interface Props {
  blurred?: boolean;
}

/**
 * The visible marketplace catalogue. When `blurred` is true the cards still
 * render but the content is unreadable — this is what the consumer sees
 * before they've verified they're 18+. Avoids the awkward "completely
 * empty page" gate UX.
 */
export default function Marketplace({ blurred = false }: Props): React.ReactElement {
  return (
    <Box
      sx={{
        filter: blurred ? 'blur(8px)' : undefined,
        pointerEvents: blurred ? 'none' : undefined,
        userSelect: blurred ? 'none' : undefined,
      }}
    >
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
        Featured this month
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, mb: 3 }}>
        Spirits Cellar
      </Typography>
      <Grid container spacing={3}>
        {PRODUCTS.map((p) => (
          <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box
                sx={{
                  height: 200,
                  background: p.gradient,
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 2,
                }}
              >
                <Stack direction="row" spacing={1}>
                  <Chip label={p.region} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.85)' }} />
                  <Chip label={`${p.abv}% ABV`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.85)' }} />
                </Stack>
              </Box>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {p.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>
                  {p.notes}
                </Typography>
                <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>
                  ${p.price}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
