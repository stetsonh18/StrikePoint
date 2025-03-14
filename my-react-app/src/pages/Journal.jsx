import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

// Icons
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';

// Components
import JournalEntryForm from '../components/journal/JournalEntryForm';
import JournalEntryCard from '../components/journal/JournalEntryCard';
import JournalEntryList from '../components/journal/JournalEntryList';
import JournalCalendarView from '../components/journal/JournalCalendarView';

// Services
import { getJournalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } from '../services/journalService';

/**
 * Journal Page Component
 * Manages the display and interaction with trading journal entries
 */
const Journal = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'calendar'
  const [openForm, setOpenForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });
  const [tabValue, setTabValue] = useState(0); // 0 for all, 1 for stocks, 2 for options

  // Data fetching
  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const fetchJournalEntries = async () => {
    setLoading(true);
    try {
      const data = await getJournalEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleOpenForm = () => {
    setEditingEntry(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setOpenForm(true);
  };

  const handleSaveEntry = async (entry) => {
    // In a real app, this would save to the backend
    // For now, just update the local state
    
    if (entry.id) {
      // Update existing entry
      setEntries(prevEntries => 
        prevEntries.map(e => e.id === entry.id ? entry : e)
      );
    } else {
      // Add new entry
      const newEntry = {
        ...entry,
        id: Date.now().toString(), // Generate a temporary ID
        createdAt: new Date().toISOString()
      };
      
      setEntries(prevEntries => [...prevEntries, newEntry]);
    }
    
    handleCloseForm();
  };

  const handleDeleteEntry = (entryId) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
  };

  // Filter and search handlers
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterTypeChange = (event) => {
    setFilterType(event.target.value);
  };

  const handleFilterTagChange = (event) => {
    setFilterTag(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleDateRangeChange = (type, date) => {
    setDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  // Filter entries based on search, filter, and date range
  const filteredEntries = entries
    .filter(entry => {
      // Filter by tab value
      if (tabValue === 1 && entry.type !== 'stock') return false;
      if (tabValue === 2 && entry.type !== 'option') return false;
      
      // Filter by type
      if (filterType !== 'all' && entry.tradeType !== filterType) return false;
      
      // Filter by tag
      if (filterTag && !entry.tags.includes(filterTag)) return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          entry.title.toLowerCase().includes(searchLower) ||
          entry.content.toLowerCase().includes(searchLower) ||
          entry.symbol.toLowerCase().includes(searchLower)
        );
      }
      
      // Filter by date range
      if (dateRange.start && dayjs(entry.date).isBefore(dateRange.start, 'day')) return false;
      if (dateRange.end && dayjs(entry.date).isAfter(dateRange.end, 'day')) return false;
      
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

  // Get unique tags for filter dropdown
  const uniqueTags = [...new Set(entries.flatMap(entry => entry.tags))];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Trading Journal
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
          New Journal Entry
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: 200 }}
          />
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="filter-type-label">Trade Type</InputLabel>
            <Select
              labelId="filter-type-label"
              id="filter-type"
              value={filterType}
              onChange={handleFilterTypeChange}
              label="Trade Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="long">Long</MenuItem>
              <MenuItem value="short">Short</MenuItem>
              <MenuItem value="swing">Swing</MenuItem>
              <MenuItem value="day">Day Trade</MenuItem>
            </Select>
          </FormControl>
          
          {uniqueTags.length > 0 && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="filter-tag-label">Tag</InputLabel>
              <Select
                labelId="filter-tag-label"
                id="filter-tag"
                value={filterTag}
                onChange={handleFilterTagChange}
                label="Tag"
              >
                <MenuItem value="">All Tags</MenuItem>
                {uniqueTags.map(tag => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          <Box sx={{ display: 'flex', border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, borderRadius: 1 }}>
            <IconButton 
              size="small" 
              onClick={() => handleViewModeChange('grid')}
              sx={{ 
                color: viewMode === 'grid' ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7),
                backgroundColor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
              }}
            >
              <ViewModuleIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleViewModeChange('list')}
              sx={{ 
                color: viewMode === 'list' ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7),
                backgroundColor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
              }}
            >
              <ViewListIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleViewModeChange('calendar')}
              sx={{ 
                color: viewMode === 'calendar' ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7),
                backgroundColor: viewMode === 'calendar' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
              }}
            >
              <CalendarTodayIcon />
            </IconButton>
          </Box>
          
          <IconButton 
            onClick={fetchJournalEntries}
            sx={{ 
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2)
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
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
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: '#ffffff',
              },
            },
          }}
        >
          <Tab label="All Entries" />
          <Tab label="Stock Trades" />
          <Tab label="Option Trades" />
        </Tabs>
      </Box>
      
      {/* Date Range Filter */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="From Date"
            value={dateRange.start}
            onChange={(date) => handleDateRangeChange('start', date)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="To Date"
            value={dateRange.end}
            onChange={(date) => handleDateRangeChange('end', date)}
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
      </Box>
      
      {/* Journal Entries Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {viewMode === 'grid' && (
            <Grid container spacing={3}>
              {filteredEntries.length > 0 ? (
                filteredEntries.map(entry => (
                  <Grid item xs={12} md={6} lg={4} key={entry.id}>
                    <JournalEntryCard 
                      entry={entry} 
                      onEdit={() => handleEditEntry(entry)} 
                      onDelete={() => handleDeleteEntry(entry.id)} 
                    />
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: theme.palette.background.paper }}>
                    <Typography variant="subtitle1" color="text.secondary">
                      No journal entries found. Create your first entry!
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
          
          {viewMode === 'list' && (
            <Paper sx={{ 
              width: '100%', 
              overflow: 'hidden',
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}>
              <JournalEntryList 
                entries={filteredEntries} 
                onEdit={handleEditEntry} 
                onDelete={handleDeleteEntry} 
              />
            </Paper>
          )}
          
          {viewMode === 'calendar' && (
            <Paper sx={{ 
              p: 2, 
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}>
              <JournalCalendarView entries={filteredEntries} onSelectEntry={handleEditEntry} />
            </Paper>
          )}
        </>
      )}
      
      {/* Journal Entry Form */}
      <JournalEntryForm 
        open={openForm} 
        onClose={handleCloseForm} 
        onSave={handleSaveEntry}
        entry={editingEntry}
      />
    </Container>
  );
};

export default Journal;
