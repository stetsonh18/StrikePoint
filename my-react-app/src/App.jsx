import React from 'react';

// MUI imports
import { CssBaseline, ThemeProvider, Box } from '@mui/material';

// Routing imports
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Component imports
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import Options from './pages/Options';
import Cash from './pages/Cash';
import Journal from './pages/Journal';
import Analytics from './pages/Analytics';

// Theme import
import darkTheme from './theme';

/**
 * Main App component that sets up the routing and theme
 */
function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navbar />
          <Sidebar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 0, // Remove padding to ensure full width
              mt: 8, // Space for the navbar
              backgroundColor: darkTheme.palette.background.default,
              minHeight: '100vh',
              width: '100%' // Ensure full width
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stocks" element={<Stocks />} />
              <Route path="/options" element={<Options />} />
              <Route path="/cash" element={<Cash />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
