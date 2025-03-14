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
  Tabs,
  Tab
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// Icon imports
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CallIcon from '@mui/icons-material/Call';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EventIcon from '@mui/icons-material/Event';

// Component imports
import OptionTable from '../components/options/OptionTable';
import OptionForm from '../components/options/OptionForm';
import StrategyForm from '../components/options/StrategyForm';

// Service imports
import { getOptionPositions, updateOptionPrices, addOptionPosition, updateOptionPosition, deleteOptionPosition } from '../services/optionService';

// Constants
const REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Options Page Component
 * Displays and manages option positions with real-time price updates
 * Supports both single-leg and multi-leg options strategies
 */
const Options = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [formType, setFormType] = useState('single'); // 'single' or 'multi'
  const [openForm, setOpenForm] = useState(false);
  const [optionPositions, setOptionPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPosition, setEditingPosition] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'entryDate', direction: 'desc' });
  const [tabValue, setTabValue] = useState(0); // 0 for all, 1 for single-leg, 2 for multi-leg
  const [selectedOptions, setSelectedOptions] = useState([]);

  // Data fetching
  useEffect(() => {
    fetchOptionPositions();
    
    // Set up interval for real-time price updates
    const interval = setInterval(() => {
      updatePrices();
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  const fetchOptionPositions = async () => {
    setLoading(true);
    try {
      const positions = await getOptionPositions();
      setOptionPositions(positions);
    } catch (error) {
      console.error('Error fetching option positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrices = async () => {
    try {
      const updatedPositions = await updateOptionPrices([...optionPositions]);
      setOptionPositions(updatedPositions);
    } catch (error) {
      console.error('Error updating option prices:', error);
    }
  };

  // Form handlers
  const handleOpenForm = (type) => {
    setFormType(type);
    setEditingPosition(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingPosition(null);
  };

  const handleEditPosition = (position) => {
    setFormType(position.optionType === 'multi-leg' ? 'multi' : 'single');
    setEditingPosition(position);
    setOpenForm(true);
  };

  const handleSavePosition = async (position) => {
    try {
      if (position.id) {
        // Update existing position
        const updatedPosition = await updateOptionPosition(position);
        setOptionPositions(prevPositions => 
          prevPositions.map(p => p.id === position.id ? updatedPosition : p)
        );
      } else {
        // Add new position
        const newPosition = await addOptionPosition(position);
        setOptionPositions(prevPositions => [...prevPositions, newPosition]);
      }
      
      handleCloseForm();
    } catch (error) {
      console.error('Error saving option position:', error);
    }
  };
  
  const handleDeletePosition = async (id) => {
    try {
      await deleteOptionPosition(id);
      setOptionPositions(prevPositions => prevPositions.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting option position:', error);
    }
  };

  // Selection handlers
  const handleSelectOption = (id) => {
    if (Array.isArray(id)) {
      // Bulk selection
      setSelectedOptions(id);
    } else {
      // Single selection toggle
      setSelectedOptions(prev => {
        if (prev.includes(id)) {
          return prev.filter(optionId => optionId !== id);
        } else {
          return [...prev, id];
        }
      });
    }
  };
  
  const handleBulkDelete = async () => {
    try {
      // In a real app, you might want to use a batch delete API
      for (const id of selectedOptions) {
        await deleteOptionPosition(id);
      }
      
      setOptionPositions(prevPositions => 
        prevPositions.filter(p => !selectedOptions.includes(p.id))
      );
      
      setSelectedOptions([]);
    } catch (error) {
      console.error('Error deleting options in bulk:', error);
    }
  };

  // Filter and search handlers
  const handleFilterChange = (event) => {
    setFilterStatus(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Sorting handler
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter, sort, and search the positions
  const filteredPositions = optionPositions
    .filter(position => {
      // Filter by tab value
      if (tabValue === 1 && position.optionType === 'multi-leg') return false;
      if (tabValue === 2 && position.optionType !== 'multi-leg') return false;
      
      // Filter by status
      if (filterStatus === 'all') return true;
      return position.status === filterStatus;
    })
    .filter(position => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        position.symbol.toLowerCase().includes(searchLower) ||
        (position.strategy && position.strategy.toLowerCase().includes(searchLower)) ||
        position.status.toLowerCase().includes(searchLower)
      );
    });

  // Convert the option positions to the format expected by OptionTable
  const tableOptions = filteredPositions.map(position => {
    if (position.optionType === 'multi-leg') {
      // This is a multi-leg strategy
      return {
        id: position.id,
        symbol: position.symbol,
        type: position.strategyType || 'custom',
        strike: position.legs && position.legs[0] ? position.legs[0].strikePrice : 0,
        expiration: position.expirationDate,
        direction: position.direction,
        quantity: position.quantityMultiplier,
        entryPrice: position.legs && position.legs.reduce((sum, leg) => {
          return sum + (leg.entryPrice * (leg.direction === 'long' ? 1 : -1));
        }, 0),
        currentPrice: position.currentPrice,
        openDate: position.entryDate,
        pnl: position.profitLoss,
        pnlPercentage: position.profitLossPercentage,
        isMultiLeg: true,
        strategy: position.strategy,
        status: position.status
      };
    } else {
      // This is a single-leg option
      return {
        id: position.id,
        symbol: position.symbol,
        type: position.optionType,
        strike: position.strikePrice,
        expiration: position.expirationDate,
        direction: position.direction,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        currentPrice: position.currentPrice,
        openDate: position.entryDate,
        pnl: position.profitLoss,
        pnlPercentage: position.profitLossPercentage,
        isMultiLeg: false,
        strategy: position.strategy,
        status: position.status
      };
    }
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Option Positions
      </Typography>
      
      {/* Action Bar */}
      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm('single')}
            sx={{ mr: 2 }}
          >
            Add Option
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm('multi')}
            sx={{ mr: 2 }}
          >
            Add Strategy
          </Button>
          
          {selectedOptions.length > 0 && (
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleBulkDelete}
              sx={{ mr: 2 }}
            >
              Delete Selected ({selectedOptions.length})
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={updatePrices} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          
          <TextField
            placeholder="Search options..."
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ mr: 2, width: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="filter-status-label">Status</InputLabel>
            <Select
              labelId="filter-status-label"
              value={filterStatus}
              label="Status"
              onChange={handleFilterChange}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              minWidth: 100,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                fontWeight: 600,
              },
            },
          }}
        >
          <Tab label="All Positions" />
          <Tab label="Single Options" />
          <Tab label="Strategies" />
        </Tabs>
      </Box>
      
      {/* Options Table */}
      <OptionTable 
        options={tableOptions}
        onEdit={handleEditPosition}
        onDelete={handleDeletePosition}
        onView={(option) => console.log('View option details', option)}
        onSelectOption={handleSelectOption}
        selectedOptions={selectedOptions}
        showCheckboxes={true}
      />
      
      {/* Option Form Dialog */}
      {formType === 'single' && (
        <OptionForm 
          open={openForm} 
          option={editingPosition}
          onClose={handleCloseForm}
          onSave={handleSavePosition}
          title={editingPosition ? "Edit Option Position" : "Add Option Position"}
        />
      )}
      
      {/* Strategy Form Dialog */}
      {formType === 'multi' && (
        <StrategyForm 
          open={openForm} 
          strategy={editingPosition}
          onClose={handleCloseForm}
          onSave={handleSavePosition}
          title={editingPosition ? "Edit Option Strategy" : "Add Option Strategy"}
        />
      )}
    </Container>
  );
};

export default Options;