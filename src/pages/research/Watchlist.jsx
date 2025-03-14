import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const Watchlist = () => {
  const theme = useTheme();
  
  // Sample watchlist data
  const watchlistItems = [
    { id: 1, symbol: 'AAPL', name: 'Apple Inc.', price: 198.45, change: 2.34, changePercent: 1.19, volume: '32.5M', alerts: ['Price Target', 'Earnings'] },
    { id: 2, symbol: 'MSFT', name: 'Microsoft Corp.', price: 425.22, change: 5.67, changePercent: 1.35, volume: '22.1M', alerts: ['Price Target'] },
    { id: 3, symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.98, change: -1.23, changePercent: -0.69, volume: '18.7M', alerts: ['News Alert'] },
    { id: 4, symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.35, change: 3.21, changePercent: 1.83, volume: '25.3M', alerts: [] },
    { id: 5, symbol: 'TSLA', name: 'Tesla Inc.', price: 175.34, change: -4.56, changePercent: -2.53, volume: '45.8M', alerts: ['Volume Alert', 'Price Target'] },
    { id: 6, symbol: 'META', name: 'Meta Platforms Inc.', price: 485.39, change: 7.82, changePercent: 1.64, volume: '15.2M', alerts: [] },
    { id: 7, symbol: 'NVDA', name: 'NVIDIA Corp.', price: 950.02, change: 15.34, changePercent: 1.64, volume: '38.9M', alerts: ['Earnings'] },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.common.white }}>
          Watchlist
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            sx={{ mr: 2, backgroundColor: theme.palette.primary.main }}
          >
            Add Symbol
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>
      
      {/* Watchlist Table */}
      <Paper sx={{ 
        width: '100%', 
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2
      }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Symbol</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Change</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Volume</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Alerts</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.background.paper }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {watchlistItems.map((item) => (
                <TableRow 
                  key={item.id}
                  hover
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{item.symbol}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {item.change >= 0 ? (
                        <TrendingUpIcon sx={{ color: '#00c853', mr: 1, fontSize: '1rem' }} />
                      ) : (
                        <TrendingDownIcon sx={{ color: '#ff3d00', mr: 1, fontSize: '1rem' }} />
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: item.change >= 0 ? '#00c853' : '#ff3d00',
                          fontWeight: 600
                        }}
                      >
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.volume}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {item.alerts.map((alert, index) => (
                        <Chip 
                          key={index} 
                          label={alert} 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                            color: theme.palette.primary.main,
                            fontWeight: 500,
                            fontSize: '0.7rem'
                          }} 
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: theme.palette.warning.main }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: theme.palette.error.main }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Watchlist;
