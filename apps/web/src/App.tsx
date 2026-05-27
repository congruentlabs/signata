import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Home from './views/Home.js';
import Import from './views/Import.js';
import Attestations from './views/Attestations.js';

const theme = createTheme({ palette: { mode: 'light' } });

export default function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<Import />} />
          <Route path="/attestations" element={<Attestations />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
