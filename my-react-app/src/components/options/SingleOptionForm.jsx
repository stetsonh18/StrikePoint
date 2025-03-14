/**
 * SingleOptionForm Component
 * 
 * Provides a form dialog for adding and editing single-leg option positions in StrikePoint.
 * Features trade details input and trade journaling capabilities.
 */
import React, { useState, useEffect } from 'react';

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Box,
  InputAdornment,
  Chip,
  Autocomplete,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';

// Date Picker Components
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import CallIcon from '@mui/icons-material/Call';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';

// Utilities
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Default form data
const DEFAULT_FORM_DATA = {
  id: '',
  symbol: '',
  optionType: 'call', // 'call' or 'put'
  direction: 'long', // 'long' or 'short'
  quantity: '',
  entryDate: dayjs(),
  entryPrice: '',
  strikePrice: '',
  expirationDate: dayjs().add(30, 'day'),
  entryFees: '',
  status: 'open',
  strategy: '',
  setupNotes: '',
  executionNotes: '',
  lessonsLearned: '',
  tags: [],
  additionalNotes: '',
  currentPrice: 0,
  profitLoss: 0,
  profitLossPercentage: 0
};

/**
 * SingleOptionForm - Form for creating and editing single-leg option positions
 * 
 * @param {boolean} open - Controls dialog visibility
 * @param {object} position - Position data for editing (null for new positions)
 * @param {function} onSubmit - Callback for form submission
 * @param {function} onCancel - Callback for cancellation
 */
const SingleOptionForm = ({ open, position, onSubmit, onCancel }) => {
  // ===== Component State =====
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  
  // ===== Reference Data =====
  // Common trading strategies
  const commonStrategies = [
    'Momentum', 'Earnings Play', 'Volatility Play', 'Directional Bet',
    'Theta Decay', 'Delta Play', 'Gamma Scalping', 'Vega Play',
    'Covered Call', 'Cash-Secured Put', 'Protective Put', 'Long Call',
    'Long Put', 'Short Call', 'Short Put', 'Technical Breakout'
  ];

  // Common tags for trade categorization
  const commonTags = [
    'Momentum', 'Earnings', 'Technical', 'Fundamental', 'News',
    'Catalyst', 'Trend', 'Oversold', 'Overbought', 'Breakout',
    'Support', 'Resistance', 'Gap', 'Volume', 'Volatility',
    'High IV', 'Low IV', 'Theta', 'Delta', 'Gamma', 'Vega'
  ];

  // ===== Effects =====
  /**
   * Initialize form with position data if editing, or reset if adding new
   */
  useEffect(() => {
    if (position) {
      setFormData({
        ...position,
        entryDate: dayjs(position.entryDate),
        expirationDate: dayjs(position.expirationDate)
      });
    } else {
      // Reset form for new position
      setFormData({
        ...DEFAULT_FORM_DATA,
        id: uuidv4() // Generate new UUID for new positions
      });
    }
  }, [position]);

  // ===== Event Handlers =====
  /**
   * Handle tab change between Trade Details and Trade Journal
   */
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  /**
   * Handle form input changes for text/select fields
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handle entry date picker changes
   */
  const handleEntryDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      entryDate: date
    }));
  };

  /**
   * Handle expiration date picker changes
   */
  const handleExpirationDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      expirationDate: date
    }));
  };

  /**
   * Handle changes to the tags multi-select
   */
  const handleTagsChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      tags: newValue
    }));
  };

  /**
   * Handle strategy autocomplete selection
   */
  const handleStrategyChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      strategy: newValue
    }));
  };

  /**
   * Handle form submission with validation
   */
  const handleSubmit = () => {
    // Validate required fields
    if (!formData.symbol || !formData.quantity || !formData.entryPrice || !formData.strikePrice) {
      // Show validation error - would implement proper validation feedback in a future iteration
      return;
    }

    // Prepare data for submission - convert strings to numbers and format dates
    const submissionData = {
      ...formData,
      quantity: Number(formData.quantity),
      entryPrice: Number(formData.entryPrice),
      strikePrice: Number(formData.strikePrice),
      entryFees: formData.entryFees ? Number(formData.entryFees) : 0,
      entryDate: formData.entryDate.toISOString(),
      expirationDate: formData.expirationDate.toISOString()
    };

    onSubmit(submissionData);
  };

  // ===== Render Components =====
  /**
   * Renders the Trade Details tab content
   */
  const renderTradeDetailsTab = () => (
    <Grid container spacing={3}>
      {/* Symbol */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Symbol"
          name="symbol"
          value={formData.symbol}
          onChange={handleChange}
          fullWidth
          required
          placeholder="e.g., AAPL, TSLA"
          InputProps={{
            sx: { textTransform: 'uppercase' }
          }}
        />
      </Grid>
      
      {/* Option Type */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel id="option-type-label">Option Type</InputLabel>
          <Select
            labelId="option-type-label"
            name="optionType"
            value={formData.optionType}
            onChange={handleChange}
            label="Option Type"
            startAdornment={
              formData.optionType === 'call' ? 
                <CallIcon color="primary" sx={{ ml: 1, mr: 1 }} /> : 
                <PhoneMissedIcon color="secondary" sx={{ ml: 1, mr: 1 }} />
            }
          >
            <MenuItem value="call">Call</MenuItem>
            <MenuItem value="put">Put</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      {/* Direction */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel id="direction-label">Direction</InputLabel>
          <Select
            labelId="direction-label"
            name="direction"
            value={formData.direction}
            onChange={handleChange}
            label="Direction"
          >
            <MenuItem value="long">Long</MenuItem>
            <MenuItem value="short">Short</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      {/* Quantity */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Quantity (Contracts)"
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
          fullWidth
          required
          type="number"
          inputProps={{ min: 1 }}
        />
      </Grid>
      
      {/* Entry Date */}
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Entry Date"
            value={formData.entryDate}
            onChange={handleEntryDateChange}
            slotProps={{
              textField: { fullWidth: true, required: true }
            }}
          />
        </LocalizationProvider>
      </Grid>
      
      {/* Entry Price */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Entry Price (per contract)"
          name="entryPrice"
          value={formData.entryPrice}
          onChange={handleChange}
          fullWidth
          required
          type="number"
          inputProps={{ step: 0.01, min: 0 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          helperText="Price per contract (not total cost)"
        />
      </Grid>
      
      {/* Strike Price */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Strike Price"
          name="strikePrice"
          value={formData.strikePrice}
          onChange={handleChange}
          fullWidth
          required
          type="number"
          inputProps={{ step: 0.01, min: 0 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
      </Grid>
      
      {/* Expiration Date */}
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Expiration Date"
            value={formData.expirationDate}
            onChange={handleExpirationDateChange}
            slotProps={{
              textField: { fullWidth: true, required: true }
            }}
          />
        </LocalizationProvider>
      </Grid>
      
      {/* Status */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
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
      
      {/* Entry Fees */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Entry Fees"
          name="entryFees"
          value={formData.entryFees}
          onChange={handleChange}
          fullWidth
          type="number"
          inputProps={{ step: 0.01, min: 0 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          helperText="Optional"
        />
      </Grid>
    </Grid>
  );

  /**
   * Renders the Trade Journal tab content
   */
  const renderTradeJournalTab = () => (
    <Grid container spacing={3}>
      {/* Strategy */}
      <Grid item xs={12}>
        <Autocomplete
          freeSolo
          options={commonStrategies}
          value={formData.strategy}
          onChange={handleStrategyChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Strategy"
              name="strategy"
              placeholder="e.g., Earnings Play, Momentum"
              fullWidth
            />
          )}
        />
      </Grid>
      
      {/* Setup Notes */}
      <Grid item xs={12}>
        <TextField
          label="Setup Notes"
          name="setupNotes"
          value={formData.setupNotes}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          placeholder="Describe your trade setup and reasoning..."
        />
      </Grid>
      
      {/* Execution Notes */}
      <Grid item xs={12}>
        <TextField
          label="Execution Notes"
          name="executionNotes"
          value={formData.executionNotes}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          placeholder="Notes about trade execution..."
        />
      </Grid>
      
      {/* Lessons Learned */}
      <Grid item xs={12}>
        <TextField
          label="Lessons Learned"
          name="lessonsLearned"
          value={formData.lessonsLearned}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          placeholder="Insights gained from this trade..."
        />
      </Grid>
      
      {/* Tags */}
      <Grid item xs={12}>
        <Autocomplete
          multiple
          freeSolo
          options={commonTags}
          value={formData.tags}
          onChange={handleTagsChange}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                {...getTagProps({ index })}
                color="primary"
                variant="outlined"
                size="small"
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder="Add tags..."
              helperText="Press Enter to add a tag"
            />
          )}
        />
      </Grid>
      
      {/* Additional Notes */}
      <Grid item xs={12}>
        <TextField
          label="Additional Notes"
          name="additionalNotes"
          value={formData.additionalNotes}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          placeholder="Any other notes about the trade..."
        />
      </Grid>
    </Grid>
  );

  // ===== Main Component Render =====
  return (
    <Dialog 
      open={open} 
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h5" component="div" fontWeight="bold">
          {position ? 'Edit Option Position' : 'Add New Option Position (Single Option)'}
        </Typography>
        <IconButton onClick={onCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="secondary"
          textColor="secondary"
          sx={{ px: 2 }}
        >
          <Tab label="Trade Details" />
          <Tab label="Trade Journal" />
        </Tabs>
      </Box>
      
      {/* Form Content */}
      <DialogContent sx={{ py: 3 }}>
        {tabValue === 0 && renderTradeDetailsTab()}
        {tabValue === 1 && renderTradeJournalTab()}
      </DialogContent>
      
      <Divider />
      
      {/* Dialog Actions */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="secondary"
          disableElevation
        >
          {position ? 'Update Position' : 'Add Position'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SingleOptionForm;
