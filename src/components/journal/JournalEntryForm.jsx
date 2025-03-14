import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  IconButton,
  Chip,
  Autocomplete,
  Divider,
  InputAdornment,
  FormHelperText,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PercentIcon from '@mui/icons-material/Percent';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * JournalEntryForm Component
 * Form for adding or editing journal entries
 */
const JournalEntryForm = ({ open, entry, onClose, onSave, allTags = [], title = "Add Journal Entry" }) => {
  const theme = useTheme();
  const isEditMode = Boolean(entry);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    date: dayjs(),
    symbol: '',
    tradeType: 'long',
    strategy: '',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    pnl: '',
    pnlPercent: '',
    status: 'open',
    setupNotes: '',
    executionNotes: '',
    lessonsLearned: '',
    tags: [],
    customTag: ''
  });

  const [errors, setErrors] = useState({});

  // Initialize form with entry data when in edit mode
  useEffect(() => {
    if (entry) {
      setFormData({
        ...entry,
        date: dayjs(entry.date)
      });
    } else {
      // Reset form for new entry
      setFormData({
        id: uuidv4(),
        date: dayjs(),
        symbol: '',
        tradeType: 'long',
        strategy: '',
        quantity: '',
        entryPrice: '',
        exitPrice: '',
        pnl: '',
        pnlPercent: '',
        status: 'open',
        setupNotes: '',
        executionNotes: '',
        lessonsLearned: '',
        tags: [],
        customTag: ''
      });
    }
    setErrors({});
  }, [entry, open]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle date change
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date
    }));
  };

  // Handle tag changes
  const handleTagsChange = (event, newTags) => {
    setFormData(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  // Add custom tag
  const handleAddCustomTag = () => {
    if (formData.customTag && !formData.tags.includes(formData.customTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.customTag],
        customTag: ''
      }));
    }
  };

  // Calculate P&L when entry or exit price changes
  useEffect(() => {
    if (formData.entryPrice && formData.exitPrice && formData.quantity) {
      const entryPrice = parseFloat(formData.entryPrice);
      const exitPrice = parseFloat(formData.exitPrice);
      const quantity = parseFloat(formData.quantity);
      
      let pnl = 0;
      let pnlPercent = 0;
      
      if (formData.tradeType === 'long' || formData.tradeType === 'call') {
        pnl = (exitPrice - entryPrice) * quantity;
        pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      } else if (formData.tradeType === 'short' || formData.tradeType === 'put') {
        pnl = (entryPrice - exitPrice) * quantity;
        pnlPercent = ((entryPrice - exitPrice) / entryPrice) * 100;
      }
      
      setFormData(prev => ({
        ...prev,
        pnl: pnl.toFixed(2),
        pnlPercent: pnlPercent.toFixed(2)
      }));
    }
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.tradeType]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.symbol) {
      newErrors.symbol = 'Symbol is required';
    }
    
    if (!formData.strategy) {
      newErrors.strategy = 'Strategy is required';
    }
    
    if (!formData.quantity || isNaN(formData.quantity) || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    
    if (!formData.entryPrice || isNaN(formData.entryPrice) || parseFloat(formData.entryPrice) <= 0) {
      newErrors.entryPrice = 'Valid entry price is required';
    }
    
    if (formData.status === 'closed') {
      if (!formData.exitPrice || isNaN(formData.exitPrice) || parseFloat(formData.exitPrice) <= 0) {
        newErrors.exitPrice = 'Valid exit price is required for closed trades';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Calculate P&L if not provided
    let calculatedPnl = formData.pnl;
    let calculatedPnlPercent = formData.pnlPercent;

    if (formData.status === 'closed' && formData.exitPrice) {
      if (!calculatedPnl) {
        const entryTotal = parseFloat(formData.entryPrice) * parseFloat(formData.quantity);
        const exitTotal = parseFloat(formData.exitPrice) * parseFloat(formData.quantity);
        
        if (formData.tradeType === 'long' || formData.tradeType === 'call') {
          calculatedPnl = exitTotal - entryTotal;
        } else {
          calculatedPnl = entryTotal - exitTotal;
        }
      }
      
      if (!calculatedPnlPercent) {
        const entryTotal = parseFloat(formData.entryPrice) * parseFloat(formData.quantity);
        calculatedPnlPercent = (calculatedPnl / entryTotal) * 100;
      }
    }

    // Prepare the entry data
    const entryData = {
      ...formData,
      pnl: calculatedPnl || 0,
      pnlPercent: calculatedPnlPercent || 0,
      id: formData.id || uuidv4()
    };

    // Call the onSubmit callback
    onSave(entryData);
  };

  // Render trade type options
  const tradeTypeOptions = [
    { value: 'long', label: 'Long Stock' },
    { value: 'short', label: 'Short Stock' },
    { value: 'call', label: 'Call Option' },
    { value: 'put', label: 'Put Option' },
    { value: 'spread', label: 'Option Spread' }
  ];

  // Common strategy options
  const strategyOptions = [
    'Trend Following',
    'Breakout',
    'Reversal',
    'Momentum',
    'Swing Trading',
    'Day Trading',
    'Scalping',
    'Gap Trading',
    'Earnings Play',
    'Dividend Capture',
    'Value Investing',
    'Growth Investing',
    'Technical Analysis',
    'Fundamental Analysis',
    'News-Based Trading',
    'Mean Reversion',
    'Pairs Trading'
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1c2639',
          backgroundImage: 'linear-gradient(rgba(33, 150, 243, 0.05), rgba(33, 150, 243, 0))',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={3}>
            {/* Trade Details Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 'bold', 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center',
                color: theme.palette.primary.main
              }}>
                <TimelineIcon sx={{ mr: 1 }} />
                Trade Details
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                error={Boolean(errors.symbol)}
                helperText={errors.symbol}
                InputProps={{
                  sx: { textTransform: 'uppercase' }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" error={Boolean(errors.tradeType)}>
                <InputLabel id="trade-type-label">Trade Type</InputLabel>
                <Select
                  labelId="trade-type-label"
                  name="tradeType"
                  value={formData.tradeType}
                  onChange={handleChange}
                  label="Trade Type"
                >
                  {tradeTypeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.tradeType && <FormHelperText>{errors.tradeType}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Trade Date"
                value={formData.date}
                onChange={handleDateChange}
                slotProps={{
                  textField: { 
                    size: 'small',
                    fullWidth: true,
                    error: Boolean(errors.date),
                    helperText: errors.date
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Autocomplete
                freeSolo
                options={strategyOptions}
                value={formData.strategy}
                onChange={(event, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    strategy: newValue
                  }));
                  if (errors.strategy) {
                    setErrors(prev => ({
                      ...prev,
                      strategy: ''
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Strategy"
                    name="strategy"
                    size="small"
                    error={Boolean(errors.strategy)}
                    helperText={errors.strategy}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Entry Price"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                error={Boolean(errors.entryPrice)}
                helperText={errors.entryPrice}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Exit Price"
                name="exitPrice"
                value={formData.exitPrice}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                error={Boolean(errors.exitPrice)}
                helperText={errors.exitPrice}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                disabled={formData.status === 'open'}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="P&L"
                name="pnl"
                value={formData.pnl}
                InputProps={{
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                fullWidth
                variant="outlined"
                size="small"
                sx={{
                  '& input': {
                    color: parseFloat(formData.pnl) >= 0 
                      ? theme.palette.success.main 
                      : theme.palette.error.main
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="P&L %"
                name="pnlPercent"
                value={formData.pnlPercent}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                fullWidth
                variant="outlined"
                size="small"
                sx={{
                  '& input': {
                    color: parseFloat(formData.pnlPercent) >= 0 
                      ? theme.palette.success.main 
                      : theme.palette.error.main
                  }
                }}
              />
            </Grid>
            
            {/* Journal Notes Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 'bold', 
                mb: 2, 
                mt: 1,
                display: 'flex', 
                alignItems: 'center',
                color: theme.palette.primary.main
              }}>
                <FormatQuoteIcon sx={{ mr: 1 }} />
                Journal Notes
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Setup Notes"
                name="setupNotes"
                value={formData.setupNotes}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={3}
                placeholder="Describe your trade setup and reasons for entering this trade..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Execution Notes"
                name="executionNotes"
                value={formData.executionNotes}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={3}
                placeholder="Describe how you executed the trade, including entry and exit decisions..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Lessons Learned"
                name="lessonsLearned"
                value={formData.lessonsLearned}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={3}
                placeholder="What did you learn from this trade? What would you do differently next time?"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                      <LightbulbIcon color="warning" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {/* Tags Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 'bold', 
                mb: 2, 
                mt: 1,
                display: 'flex', 
                alignItems: 'center',
                color: theme.palette.primary.main
              }}>
                <LocalOfferIcon sx={{ mr: 1 }} />
                Tags
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={allTags.filter(tag => !formData.tags.includes(tag))}
                  value={formData.tags}
                  onChange={handleTagsChange}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip 
                        label={option} 
                        {...getTagProps({ index })} 
                        key={option}
                        size="small"
                        sx={{ 
                          backgroundColor: theme.palette.primary.main,
                          color: '#fff'
                        }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Add tags..."
                      size="small"
                      fullWidth
                    />
                  )}
                  sx={{ flexGrow: 1 }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    label="Custom Tag"
                    name="customTag"
                    value={formData.customTag}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                    placeholder="New tag..."
                    sx={{ width: 150 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddCustomTag}
                    disabled={!formData.customTag}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
              <FormHelperText>
                <InfoOutlinedIcon fontSize="small" sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
                Tags help you categorize and filter your journal entries
              </FormHelperText>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          startIcon={isEditMode ? <EditIcon /> : <AddIcon />}
        >
          {isEditMode ? 'Update Entry' : 'Add Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JournalEntryForm;
