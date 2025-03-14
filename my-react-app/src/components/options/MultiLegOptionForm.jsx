/**
 * MultiLegOptionForm Component
 * 
 * Provides a form dialog for adding and editing multi-leg option strategies in StrikePoint.
 * Supports various option strategies with dynamic leg management.
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
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';

// Date Picker Components
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CallIcon from '@mui/icons-material/Call';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import LayersIcon from '@mui/icons-material/Layers';

// Utilities
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Default form data
const DEFAULT_FORM_DATA = {
  id: '',
  symbol: '',
  optionType: 'multi-leg',
  strategyType: 'vertical-spread',
  direction: 'long',
  quantityMultiplier: 1,
  entryDate: dayjs(),
  entryFees: '',
  status: 'open',
  strategy: '',
  setupNotes: '',
  executionNotes: '',
  lessonsLearned: '',
  tags: [],
  additionalNotes: '',
  legs: [],
  currentPrice: 0,
  profitLoss: 0,
  profitLossPercentage: 0
};

// Default leg data
const DEFAULT_LEG = {
  id: '',
  optionType: 'call',
  direction: 'long',
  quantity: 1,
  strikePrice: '',
  expirationDate: dayjs().add(30, 'day'),
  entryPrice: ''
};

/**
 * MultiLegOptionForm - Form for creating and editing multi-leg option strategies
 * 
 * @param {boolean} open - Controls dialog visibility
 * @param {object} position - Position data for editing (null for new positions)
 * @param {function} onSubmit - Callback for form submission
 * @param {function} onCancel - Callback for cancellation
 */
const MultiLegOptionForm = ({ open, position, onSubmit, onCancel }) => {
  // ===== Component State =====
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  
  // ===== Reference Data =====
  // Option strategy types
  const strategyTypes = [
    { value: 'vertical-spread', label: 'Vertical Spread', description: 'Buy and sell options of the same type at different strike prices' },
    { value: 'iron-condor', label: 'Iron Condor', description: 'Combination of a bull put spread and a bear call spread' },
    { value: 'butterfly', label: 'Butterfly', description: 'Buy one option, sell two at a middle strike, buy one at a higher strike' },
    { value: 'calendar-spread', label: 'Calendar Spread', description: 'Buy and sell options of the same type with different expiration dates' },
    { value: 'straddle', label: 'Straddle', description: 'Buy a call and a put at the same strike price' },
    { value: 'strangle', label: 'Strangle', description: 'Buy a call and a put at different strike prices' },
    { value: 'diagonal-spread', label: 'Diagonal Spread', description: 'Buy and sell options with different strike prices and expiration dates' },
    { value: 'custom', label: 'Custom Strategy', description: 'Create a custom multi-leg option strategy' }
  ];

  // Common trading strategies
  const commonStrategies = [
    'Volatility Play', 'Earnings Play', 'Neutral Strategy', 'Directional Bet',
    'Theta Decay', 'Delta Hedge', 'Vega Play', 'Risk-Defined Trade',
    'Credit Spread', 'Debit Spread', 'Calendar Play', 'Gamma Scalping'
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
      // Format dates for editing an existing position
      const formattedPosition = {
        ...position,
        entryDate: dayjs(position.entryDate),
        legs: position.legs.map(leg => ({
          ...leg,
          expirationDate: dayjs(leg.expirationDate)
        }))
      };
      setFormData(formattedPosition);
    } else {
      // Reset form for new position with default legs based on strategy
      const newPosition = {
        ...DEFAULT_FORM_DATA,
        id: uuidv4(), // Generate new UUID for new positions
        legs: generateDefaultLegs('vertical-spread')
      };
      setFormData(newPosition);
    }
  }, [position]);

  // ===== Helper Functions =====
  /**
   * Generate default legs based on strategy type
   */
  const generateDefaultLegs = (strategyType) => {
    switch (strategyType) {
      case 'vertical-spread':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'long' },
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'short' }
        ];
      case 'iron-condor':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'put', direction: 'short' },
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'put', direction: 'long' },
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'call', direction: 'short' },
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'call', direction: 'long' }
        ];
      case 'butterfly':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'long' },
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'short', quantity: 2 },
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'long' }
        ];
      case 'straddle':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'call', direction: 'long' },
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'put', direction: 'long' }
        ];
      case 'strangle':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'call', direction: 'long' },
          { ...DEFAULT_LEG, id: uuidv4(), optionType: 'put', direction: 'long' }
        ];
      case 'calendar-spread':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'long', expirationDate: dayjs().add(60, 'day') },
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'short', expirationDate: dayjs().add(30, 'day') }
        ];
      case 'diagonal-spread':
        return [
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'long', expirationDate: dayjs().add(60, 'day') },
          { ...DEFAULT_LEG, id: uuidv4(), direction: 'short', expirationDate: dayjs().add(30, 'day') }
        ];
      case 'custom':
      default:
        return [
          { ...DEFAULT_LEG, id: uuidv4() }
        ];
    }
  };

  /**
   * Calculate the net cost/credit of the strategy
   */
  const calculateNetCost = () => {
    if (!formData.legs || formData.legs.length === 0) return 0;
    
    return formData.legs.reduce((total, leg) => {
      if (!leg.entryPrice) return total;
      
      const legCost = leg.entryPrice * leg.quantity * (leg.direction === 'long' ? 1 : -1);
      return total + legCost;
    }, 0);
  };

  /**
   * Get strategy description
   */
  const getStrategyDescription = () => {
    const strategy = strategyTypes.find(s => s.value === formData.strategyType);
    return strategy ? strategy.description : '';
  };

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

    // If strategy type changes, update legs
    if (name === 'strategyType') {
      setFormData(prev => ({
        ...prev,
        legs: generateDefaultLegs(value)
      }));
    }
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
   * Add a new leg to the strategy
   */
  const handleAddLeg = () => {
    setFormData(prev => ({
      ...prev,
      legs: [...prev.legs, { ...DEFAULT_LEG, id: uuidv4() }]
    }));
  };

  /**
   * Remove a leg from the strategy
   */
  const handleRemoveLeg = (legId) => {
    setFormData(prev => ({
      ...prev,
      legs: prev.legs.filter(leg => leg.id !== legId)
    }));
  };

  /**
   * Handle changes to leg fields
   */
  const handleLegChange = (legId, field, value) => {
    setFormData(prev => ({
      ...prev,
      legs: prev.legs.map(leg => 
        leg.id === legId ? { ...leg, [field]: value } : leg
      )
    }));
  };

  /**
   * Handle form submission with validation
   */
  const handleSubmit = () => {
    // Validate required fields
    if (!formData.symbol || !formData.quantityMultiplier || formData.legs.length === 0) {
      // Show validation error - would implement proper validation feedback in a future iteration
      return;
    }

    // Validate legs
    for (const leg of formData.legs) {
      if (!leg.strikePrice || !leg.entryPrice) {
        // Show validation error
        return;
      }
    }

    // Prepare data for submission - convert strings to numbers and format dates
    const submissionData = {
      ...formData,
      quantityMultiplier: Number(formData.quantityMultiplier),
      entryFees: formData.entryFees ? Number(formData.entryFees) : 0,
      entryDate: formData.entryDate.toISOString(),
      legs: formData.legs.map(leg => ({
        ...leg,
        quantity: Number(leg.quantity),
        strikePrice: Number(leg.strikePrice),
        entryPrice: Number(leg.entryPrice),
        expirationDate: leg.expirationDate.toISOString()
      }))
    };

    onSubmit(submissionData);
  };

  // ===== Render Components =====
  /**
   * Renders the Trade Details tab content
   */
  const renderTradeDetailsTab = () => (
    <Grid container spacing={3}>
      {/* Strategy Type with Description */}
      <Grid item xs={12}>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth required>
            <InputLabel id="strategy-type-label">Strategy Type</InputLabel>
            <Select
              labelId="strategy-type-label"
              name="strategyType"
              value={formData.strategyType}
              onChange={handleChange}
              label="Strategy Type"
              startAdornment={
                <LayersIcon sx={{ ml: 1, mr: 1, color: '#ff9800' }} />
              }
            >
              {strategyTypes.map(strategy => (
                <MenuItem key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            <InfoOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
            {getStrategyDescription()}
          </Typography>
        </Box>
      </Grid>

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
      
      {/* Direction */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel id="direction-label">Overall Direction</InputLabel>
          <Select
            labelId="direction-label"
            name="direction"
            value={formData.direction}
            onChange={handleChange}
            label="Overall Direction"
          >
            <MenuItem value="long">Long (Debit)</MenuItem>
            <MenuItem value="short">Short (Credit)</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      {/* Quantity Multiplier */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Quantity Multiplier"
          name="quantityMultiplier"
          value={formData.quantityMultiplier}
          onChange={handleChange}
          fullWidth
          required
          type="number"
          inputProps={{ min: 1 }}
          helperText="Number of strategy units (multiplies all leg quantities)"
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

      {/* Strategy Legs Section */}
      <Grid item xs={12}>
        <Box sx={{ mb: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <LayersIcon sx={{ mr: 1 }} />
            Strategy Legs
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer component={Paper} sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Strike Price</TableCell>
                  <TableCell>Expiration</TableCell>
                  <TableCell>Entry Price</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.legs.map((leg, index) => (
                  <TableRow key={leg.id}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={leg.optionType}
                          onChange={(e) => handleLegChange(leg.id, 'optionType', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="call">Call</MenuItem>
                          <MenuItem value="put">Put</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={leg.direction}
                          onChange={(e) => handleLegChange(leg.id, 'direction', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="long">Long</MenuItem>
                          <MenuItem value="short">Short</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={leg.quantity}
                        onChange={(e) => handleLegChange(leg.id, 'quantity', e.target.value)}
                        inputProps={{ min: 1 }}
                        size="small"
                        sx={{ width: '70px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={leg.strikePrice}
                        onChange={(e) => handleLegChange(leg.id, 'strikePrice', e.target.value)}
                        placeholder="Strike"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        inputProps={{ step: 0.5 }}
                        size="small"
                        sx={{ width: '120px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          value={leg.expirationDate}
                          onChange={(date) => handleLegChange(leg.id, 'expirationDate', date)}
                          slotProps={{
                            textField: { size: 'small', sx: { width: '150px' } }
                          }}
                        />
                      </LocalizationProvider>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={leg.entryPrice}
                        onChange={(e) => handleLegChange(leg.id, 'entryPrice', e.target.value)}
                        placeholder="Price"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        inputProps={{ step: 0.01 }}
                        size="small"
                        sx={{ width: '120px' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove Leg">
                        <IconButton 
                          size="small"
                          onClick={() => handleRemoveLeg(leg.id)}
                          disabled={formData.legs.length <= 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddLeg}
              variant="outlined"
              color="primary"
              size="small"
            >
              Add Leg
            </Button>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                Net Cost/Credit: 
                <Typography 
                  component="span" 
                  sx={{ 
                    ml: 1, 
                    fontWeight: 'bold',
                    color: calculateNetCost() >= 0 ? 'error.main' : 'success.main'
                  }}
                >
                  {calculateNetCost() >= 0 ? 'Debit' : 'Credit'} {Math.abs(calculateNetCost()).toFixed(2)}
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Box>
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
              placeholder="e.g., Volatility Play, Earnings Play"
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
      maxWidth="lg"
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
          {position ? 'Edit Option Strategy' : 'Add New Option Strategy (Multi-Leg)'}
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
          <Tab label="Strategy Details" />
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
          {position ? 'Update Strategy' : 'Add Strategy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultiLegOptionForm;
