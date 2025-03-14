import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Paper, 
  Button,
  IconButton,
  Divider,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Collapse,
  Card,
  CardContent,
  Toolbar,
  alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// Icon imports
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// Component imports
import StockTable from '../components/stocks/StockTable';
import StockForm from '../components/stocks/StockForm';

// Service imports
import { getStockPositions, updateStockPrices, deleteStockPosition, deleteStockPositions } from '../services/stockService';

// Constants
const REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Stocks Page Component
 * Displays and manages stock positions with real-time price updates
 */
const Stocks = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [openForm, setOpenForm] = useState(false);
  const [stockPositions, setStockPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPosition, setEditingPosition] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDirection, setFilterDirection] = useState('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'entryDate', direction: 'desc' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, isBulk: false, ids: [] });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Data fetching
  useEffect(() => {
    fetchStockPositions();
    
    // Set up interval for real-time price updates
    const interval = setInterval(() => {
      updatePrices();
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStockPositions = async () => {
    setLoading(true);
    try {
      const positions = await getStockPositions();
      setStockPositions(positions);
    } catch (error) {
      console.error('Error fetching stock positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrices = async () => {
    try {
      const updatedPositions = await updateStockPrices([...stockPositions]);
      setStockPositions(updatedPositions);
    } catch (error) {
      console.error('Error updating stock prices:', error);
    }
  };

  // Form handlers
  const handleOpenForm = () => {
    setEditingPosition(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingPosition(null);
  };

  const handleEditPosition = (position) => {
    setEditingPosition(position);
    setOpenForm(true);
  };

  const handleSavePosition = async (position) => {
    // In a real app, this would save to the backend
    // For now, just update the local state
    
    if (position.id) {
      // Update existing position
      setStockPositions(prevPositions => 
        prevPositions.map(p => p.id === position.id ? position : p)
      );
    } else {
      // Add new position
      const newPosition = {
        ...position,
        id: Date.now().toString(), // Generate a temporary ID
        currentPrice: position.entryPrice, // Initially set current price to entry price
        profitLoss: 0,
        profitLossPercent: 0
      };
      
      setStockPositions(prevPositions => [...prevPositions, newPosition]);
    }
    
    handleCloseForm();
  };

  // Delete handlers
  const handleDeleteClick = (id) => {
    setDeleteDialog({ open: true, id, isBulk: false, ids: [] });
  };

  const handleBulkDeleteClick = (ids) => {
    setDeleteDialog({ open: true, id: null, isBulk: true, ids });
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      
      if (deleteDialog.isBulk) {
        await deleteStockPositions(deleteDialog.ids);
        setStockPositions(prevPositions => 
          prevPositions.filter(position => !deleteDialog.ids.includes(position.id))
        );
      } else {
        await deleteStockPosition(deleteDialog.id);
        setStockPositions(prevPositions => 
          prevPositions.filter(position => position.id !== deleteDialog.id)
        );
      }
    } catch (error) {
      console.error('Error deleting position(s):', error);
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, id: null, isBulk: false, ids: [] });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, id: null, isBulk: false, ids: [] });
  };

  // Filter panel toggle
  const toggleFilterPanel = () => {
    setShowFilterPanel(prev => !prev);
  };

  // Filter and search handlers
  const handleFilterChange = (event) => {
    setFilterStatus(event.target.value);
  };

  const handleDirectionChange = (event) => {
    setFilterDirection(event.target.value);
  };

  const handleStartDateChange = (date) => {
    setDateRange(prev => ({ ...prev, startDate: date }));
  };

  const handleEndDateChange = (date) => {
    setDateRange(prev => ({ ...prev, endDate: date }));
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterDirection('all');
    setDateRange({ startDate: '', endDate: '' });
    setSearchTerm('');
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Sort handler
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter, sort, and search the positions
  const filteredPositions = stockPositions
    .filter(position => {
      if (filterStatus === 'all') return true;
      return position.status === filterStatus;
    })
    .filter(position => {
      if (filterDirection === 'all') return true;
      return position.direction === filterDirection;
    })
    .filter(position => {
      if (!dateRange.startDate && !dateRange.endDate) return true;
      
      const entryDate = new Date(position.entryDate);
      const entryDateStr = entryDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      if (dateRange.startDate && dateRange.endDate) {
        return entryDateStr >= dateRange.startDate && entryDateStr <= dateRange.endDate;
      }
      
      if (dateRange.startDate) {
        return entryDateStr >= dateRange.startDate;
      }
      
      if (dateRange.endDate) {
        return entryDateStr <= dateRange.endDate;
      }
      
      return true;
    })
    .filter(position => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        position.symbol.toLowerCase().includes(searchLower) ||
        position.direction.toLowerCase().includes(searchLower) ||
        position.status.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterDirection !== 'all') count++;
    if (dateRange.startDate) count++;
    if (dateRange.endDate) count++;
    return count;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Stock Positions
      </Typography>
      
      {/* Action Bar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleOpenForm}
          sx={{ 
            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            boxShadow: '0 4px 8px rgba(33, 150, 243, 0.25)',
            fontWeight: 600,
            px: 2.5
          }}
        >
          Add Position
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={toggleFilterPanel}
            color={showFilterPanel || filterStatus !== 'all' || filterDirection !== 'all' || dateRange.startDate || dateRange.endDate ? "primary" : "inherit"}
            sx={{
              borderColor: showFilterPanel || filterStatus !== 'all' || filterDirection !== 'all' || dateRange.startDate || dateRange.endDate ? 'primary.main' : 'rgba(255, 255, 255, 0.23)',
              fontWeight: 500
            }}
          >
            Filters
            {(filterStatus !== 'all' || filterDirection !== 'all' || dateRange.startDate || dateRange.endDate) && (
              <Chip 
                label={getActiveFilterCount()} 
                color="primary" 
                size="small" 
                sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} 
              />
            )}
          </Button>
          
          <TextField
            size="small"
            placeholder="Search positions..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220 }}
          />
          
          <IconButton 
            onClick={updatePrices} 
            color="primary" 
            size="small" 
            sx={{ 
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.2)' } 
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="outlined" 
            onClick={handleClearFilters}
            sx={{ 
              borderColor: 'rgba(255, 255, 255, 0.23)',
              fontWeight: 500
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Box>
      
      {/* Filter Panel */}
      <Collapse in={showFilterPanel} timeout="auto" unmountOnExit>
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 3, 
            bgcolor: 'rgba(30, 39, 69, 0.6)', 
            borderColor: 'rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Filter Positions
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleClearFilters}
                startIcon={<FilterListIcon />}
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                  fontWeight: 500
                }}
              >
                Reset Filters
              </Button>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="filter-status-label-panel">Status</InputLabel>
                  <Select
                    labelId="filter-status-label-panel"
                    id="filter-status-panel"
                    value={filterStatus}
                    onChange={handleFilterChange}
                    label="Status"
                  >
                    <MenuItem value="all">All Positions</MenuItem>
                    <MenuItem value="open">Open Positions</MenuItem>
                    <MenuItem value="closed">Closed Positions</MenuItem>
                  </Select>
                </FormControl>
                {filterStatus !== 'all' && (
                  <Chip 
                    label={filterStatus === 'open' ? 'Open Only' : 'Closed Only'} 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }}
                    onDelete={() => setFilterStatus('all')}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="filter-direction-label-panel">Direction</InputLabel>
                  <Select
                    labelId="filter-direction-label-panel"
                    id="filter-direction-panel"
                    value={filterDirection}
                    onChange={handleDirectionChange}
                    label="Direction"
                  >
                    <MenuItem value="all">All Directions</MenuItem>
                    <MenuItem value="long">Long</MenuItem>
                    <MenuItem value="short">Short</MenuItem>
                  </Select>
                </FormControl>
                {filterDirection !== 'all' && (
                  <Chip 
                    label={filterDirection === 'long' ? 'Long Only' : 'Short Only'} 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }}
                    onDelete={() => setFilterDirection('all')}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  size="small"
                  label="Start Date"
                  type="date"
                  value={dateRange.startDate || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  fullWidth
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                    }
                  }}
                />
                {dateRange.startDate && (
                  <Chip 
                    label={`From: ${dateRange.startDate}`}
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }}
                    onDelete={() => setDateRange(prev => ({ ...prev, startDate: '' }))}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  size="small"
                  label="End Date"
                  type="date"
                  value={dateRange.endDate || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  fullWidth
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                    }
                  }}
                />
                {dateRange.endDate && (
                  <Chip 
                    label={`To: ${dateRange.endDate}`}
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }}
                    onDelete={() => setDateRange(prev => ({ ...prev, endDate: '' }))}
                  />
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>
      
      {/* Stock Table */}
      <Paper sx={{ 
        width: '100%', 
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <StockTable 
          positions={filteredPositions} 
          loading={loading}
          onEdit={handleEditPosition}
          onDelete={handleDeleteClick}
          onBulkDelete={handleBulkDeleteClick}
          onSort={requestSort}
          sortConfig={sortConfig}
        />
      </Paper>
      
      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {deleteDialog.isBulk ? 'Delete Multiple Positions' : 'Delete Position'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {deleteDialog.isBulk ? 'these positions' : 'this position'}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Stock Form Dialog */}
      <StockForm 
        open={openForm} 
        onCancel={handleCloseForm} 
        onSubmit={handleSavePosition}
        position={editingPosition}
      />
    </Container>
  );
};

export default Stocks;
