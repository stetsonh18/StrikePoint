import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './infrastructure/api/queryClient';
import { RootLayout } from './presentation/layouts/RootLayout';
import { Dashboard } from './presentation/pages/Dashboard';
import { Trades } from './presentation/pages/Trades';
import { Analytics } from './presentation/pages/Analytics';
import { Settings } from './presentation/pages/Settings';
import { useTheme } from './application/hooks/useTheme';

function App() {
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="trades" element={<Trades />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
