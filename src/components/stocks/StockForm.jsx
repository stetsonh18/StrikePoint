/**
 * StockForm Component
 * 
 * Provides a form dialog for adding and editing stock positions in StrikePoint.
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

// Utilities
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Default form data
const DEFAULT_FORM_DATA = {
  id: '',
  symbol: '',
  direction: 'long',
  quantity: '',
  entryDate: dayjs(),
  entryPrice: '',
  stopLoss: '',
  takeProfit: '',
  entryFees: '',
  status: 'open',
  exitQuantity: '',
  exitPrice: '',
  exitFees: '',
  exitDate: null,
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
 * StockForm - Form for creating and editing stock positions
 * 
 * @param {boolean} open - Controls dialog visibility
 * @param {object} position - Position data for editing (null for new positions)
 * @param {function} onSubmit - Callback for form submission
 * @param {function} onCancel - Callback for cancellation
 */
const StockForm = ({ open, position, onSubmit, onCancel }) => {
  // ===== Component State =====
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  
  // ===== Reference Data =====
  // Common trading strategies
  const commonStrategies = [
    'Breakout', 'Swing Trade', 'Momentum', 'Reversal', 'Gap Fill',
    'Trend Following', 'Mean Reversion', 'Earnings Play', 'Scalping', 'Position Trading'
  ];

  // Common tags for trade categorization
  const commonTags = [
    'Momentum', 'Earnings', 'Technical', 'Fundamental', 'News',
    'Catalyst', 'Trend', 'Oversold', 'Overbought', 'Breakout',
    'Support', 'Resistance', 'Gap', 'Volume', 'Volatility'
  ];

  // ===== Effects =====
  /**
   * Initialize form with position data if editing, or reset if adding new
   */
  useEffect(() => {
    if (position) {
      setFormData({
        ...position,
        entryDate: dayjs(position.entryDate)
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
   * Handle date change for entry date
   */
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      entryDate: date
    }));
  };

  /**
   * Handle date change for exit date
   */
  const handleExitDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      exitDate: date
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
    if (!formData.symbol || !formData.quantity || !formData.entryPrice) {
      // Show validation error - would implement proper validation feedback in a future iteration
      return;
    }

    // Additional validation for closed positions
    if (formData.status === 'closed') {
      if (!formData.exitQuantity || !formData.exitPrice || !formData.exitDate) {
        // Show validation error for missing exit details
        return;
      }
    }

    // Prepare data for submission - convert strings to numbers and format date
    const submissionData = {
      ...formData,
      quantity: Number(formData.quantity),
      entryPrice: Number(formData.entryPrice),
      stopLoss: formData.stopLoss ? Number(formData.stopLoss) : null,
      takeProfit: formData.takeProfit ? Number(formData.takeProfit) : null,
      entryFees: formData.entryFees ? Number(formData.entryFees) : 0,
      entryDate: formData.entryDate.toISOString()
    };

    // Add exit details if status is closed
    if (formData.status === 'closed') {
      submissionData.exitQuantity = Number(formData.exitQuantity);
      submissionData.exitPrice = Number(formData.exitPrice);
      submissionData.exitFees = formData.exitFees ? Number(formData.exitFees) : 0;
      submissionData.exitDate = formData.exitDate.toISOString();
    }

    onSubmit(submissionData);
  };

  // ===== Render Components =====
  /**
   * Renders the Trade Details tab content
   */
  const renderTradeDetailsTab = () => (
    <Grid container spacing={3}>
      {/* Trade Entry Section */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Trade Details
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>

      {/* Symbol */}
      <Grid item xs={12} sm={6} md={4}>
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
      
      {/* Direction */}
      <Grid item xs={12} sm={6} md={4}>
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

      {/* Status */}
      <Grid item xs={12} sm={6} md={4}>
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
      
      {/* Entry Section */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 1 }}>
          Entry Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>

      {/* Entry Date */}
      <Grid item xs={12} sm={6} md={4}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Entry Date"
            value={formData.entryDate}
            onChange={handleDateChange}
            slotProps={{
              textField: { fullWidth: true, required: true }
            }}
          />
        </LocalizationProvider>
      </Grid>
      
      {/* Quantity */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label="Quantity"
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
          fullWidth
          required
          type="number"
          inputProps={{ min: 1 }}
        />
      </Grid>
      
      {/* Entry Price */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label="Entry Price"
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
        />
      </Grid>
      
      {/* Entry Fees */}
      <Grid item xs={12} sm={6} md={4}>
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
        />
      </Grid>

      {/* Risk Management Section */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 1 }}>
          Risk Management
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      {/* Stop Loss */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Stop Loss"
          name="stopLoss"
          value={formData.stopLoss}
          onChange={handleChange}
          fullWidth
          type="number"
          inputProps={{ step: 0.01, min: 0 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
      </Grid>
      
      {/* Take Profit */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Take Profit"
          name="takeProfit"
          value={formData.takeProfit}
          onChange={handleChange}
          fullWidth
          type="number"
          inputProps={{ step: 0.01, min: 0 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
      </Grid>

      {/* Exit Details Section - Only visible when status is closed */}
      {formData.status === 'closed' && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 1 }}>
              Exit Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          {/* Exit Date */}
          <Grid item xs={12} sm={6} md={4}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Exit Date"
                value={formData.exitDate}
                onChange={handleExitDateChange}
                slotProps={{
                  textField: { fullWidth: true, required: true }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Exit Quantity */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Exit Quantity"
              name="exitQuantity"
              value={formData.exitQuantity}
              onChange={handleChange}
              fullWidth
              required
              type="number"
              inputProps={{ min: 1 }}
            />
          </Grid>
          
          {/* Exit Price */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Exit Price"
              name="exitPrice"
              value={formData.exitPrice}
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
          
          {/* Exit Fees */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Exit Fees"
              name="exitFees"
              value={formData.exitFees}
              onChange={handleChange}
              fullWidth
              type="number"
              inputProps={{ step: 0.01, min: 0 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
        </>
      )}
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
              placeholder="e.g., Breakout, Swing Trade"
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
          {position ? 'Edit Stock Position' : 'Add New Stock Position'}
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
          indicatorColor="primary"
          textColor="primary"
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
          color="primary"
          disableElevation
        >
          {position ? 'Update Position' : 'Add Position'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockForm;
