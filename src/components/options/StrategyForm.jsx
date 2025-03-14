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
  InputAdornment,
  Divider,
  Chip,
  useTheme,
  alpha,
  Paper,
  Stepper,
  Step,
  StepLabel,
  FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * StrategyForm Component
 * Form for adding or editing multi-leg option strategies
 */
const StrategyForm = ({ open, strategy, onClose, onSave, title = "Add Option Strategy" }) => {
  const theme = useTheme();
  const isEditMode = Boolean(strategy);
  
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Strategy Details', 'Add Option Legs', 'Risk Management'];
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    type: 'spread',
    direction: 'bullish',
    openDate: dayjs(),
    expiration: null,
    legs: [],
    maxLoss: '',
    maxProfit: '',
    breakEven: '',
    notes: '',
    status: 'open'
  });
  
  // Current leg being edited
  const [currentLeg, setCurrentLeg] = useState({
    type: 'call',
    direction: 'long',
    strike: '',
    quantity: 1,
    premium: ''
  });
  
  // Form validation
  const [errors, setErrors] = useState({});
  const [legErrors, setLegErrors] = useState({});
  
  // Initialize form with strategy data if editing
  useEffect(() => {
    if (strategy) {
      setFormData({
        ...strategy,
        openDate: strategy.openDate ? dayjs(strategy.openDate) : dayjs(),
        expiration: strategy.expiration ? dayjs(strategy.expiration) : null
      });
    } else {
      // Reset form for new strategy
      setFormData({
        name: '',
        symbol: '',
        type: 'spread',
        direction: 'bullish',
        openDate: dayjs(),
        expiration: null,
        legs: [],
        maxLoss: '',
        maxProfit: '',
        breakEven: '',
        notes: '',
        status: 'open'
      });
    }
    
    // Reset errors and stepper
    setErrors({});
    setLegErrors({});
    setActiveStep(0);
  }, [strategy, open]);
  
  // Handle form input changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  // Handle date changes
  const handleDateChange = (name, date) => {
    setFormData({
      ...formData,
      [name]: date
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  // Handle current leg changes
  const handleLegChange = (event) => {
    const { name, value } = event.target;
    setCurrentLeg({
      ...currentLeg,
      [name]: value
    });
    
    // Clear error for this field
    if (legErrors[name]) {
      setLegErrors({
        ...legErrors,
        [name]: null
      });
    }
  };
  
  // Add a leg to the strategy
  const handleAddLeg = () => {
    // Validate leg
    const newLegErrors = {};
    
    if (!currentLeg.strike) {
      newLegErrors.strike = 'Strike price is required';
    } else if (isNaN(currentLeg.strike)) {
      newLegErrors.strike = 'Strike price must be a number';
    }
    
    if (!currentLeg.quantity) {
      newLegErrors.quantity = 'Quantity is required';
    } else if (isNaN(currentLeg.quantity) || currentLeg.quantity <= 0) {
      newLegErrors.quantity = 'Quantity must be a positive number';
    }
    
    if (!currentLeg.premium) {
      newLegErrors.premium = 'Premium is required';
    } else if (isNaN(currentLeg.premium)) {
      newLegErrors.premium = 'Premium must be a number';
    }
    
    setLegErrors(newLegErrors);
    
    if (Object.keys(newLegErrors).length === 0) {
      // Add leg to strategy
      const newLeg = {
        ...currentLeg,
        id: Date.now().toString(),
        strike: parseFloat(currentLeg.strike),
        quantity: parseInt(currentLeg.quantity, 10),
        premium: parseFloat(currentLeg.premium)
      };
      
      setFormData({
        ...formData,
        legs: [...formData.legs, newLeg]
      });
      
      // Reset current leg
      setCurrentLeg({
        type: 'call',
        direction: 'long',
        strike: '',
        quantity: 1,
        premium: ''
      });
    }
  };
  
  // Remove a leg from the strategy
  const handleRemoveLeg = (legId) => {
    setFormData({
      ...formData,
      legs: formData.legs.filter(leg => leg.id !== legId)
    });
  };
  
  // Validate form for current step
  const validateStep = () => {
    const newErrors = {};
    
    if (activeStep === 0) {
      // Validate strategy details
      if (!formData.name) {
        newErrors.name = 'Strategy name is required';
      }
      
      if (!formData.symbol) {
        newErrors.symbol = 'Symbol is required';
      }
      
      if (!formData.expiration) {
        newErrors.expiration = 'Expiration date is required';
      }
    } else if (activeStep === 1) {
      // Validate legs
      if (formData.legs.length === 0) {
        newErrors.legs = 'At least one option leg is required';
      }
    } else if (activeStep === 2) {
      // Validate risk management
      if (!formData.maxLoss) {
        newErrors.maxLoss = 'Maximum loss is required';
      } else if (isNaN(formData.maxLoss)) {
        newErrors.maxLoss = 'Maximum loss must be a number';
      }
      
      if (!formData.maxProfit) {
        newErrors.maxProfit = 'Maximum profit is required';
      } else if (isNaN(formData.maxProfit)) {
        newErrors.maxProfit = 'Maximum profit must be a number';
      }
      
      if (!formData.breakEven) {
        newErrors.breakEven = 'Break-even point is required';
      } else if (isNaN(formData.breakEven)) {
        newErrors.breakEven = 'Break-even point must be a number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep(prevStep => prevStep + 1);
    }
  };
  
  // Handle back step
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (validateStep()) {
      // Convert dates to ISO strings
      const formattedData = {
        ...formData,
        openDate: formData.openDate.toISOString(),
        expiration: formData.expiration.toISOString(),
        maxLoss: parseFloat(formData.maxLoss),
        maxProfit: parseFloat(formData.maxProfit),
        breakEven: parseFloat(formData.breakEven)
      };
      
      onSave(formattedData);
    }
  };
  
  // Get strategy type label
  const getStrategyTypeLabel = (type) => {
    switch (type) {
      case 'spread':
        return 'Spread';
      case 'condor':
        return 'Iron Condor';
      case 'butterfly':
        return 'Butterfly';
      case 'straddle':
        return 'Straddle';
      case 'strangle':
        return 'Strangle';
      case 'calendar':
        return 'Calendar Spread';
      default:
        return 'Custom';
    }
  };
  
  // Get direction label
  const getDirectionLabel = (direction) => {
    switch (direction) {
      case 'bullish':
        return 'Bullish';
      case 'bearish':
        return 'Bearish';
      case 'neutral':
        return 'Neutral';
      case 'volatility':
        return 'Volatility';
      default:
        return direction;
    }
  };
  
  // Calculate net premium
  const calculateNetPremium = () => {
    return formData.legs.reduce((total, leg) => {
      const premium = leg.direction === 'long' 
        ? -leg.premium * leg.quantity * 100 
        : leg.premium * leg.quantity * 100;
      return total + premium;
    }, 0);
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        pb: 2
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {/* Step 1: Strategy Details */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  Strategy Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Strategy Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                  placeholder="e.g., AAPL Bull Call Spread"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  fullWidth
                  error={Boolean(errors.symbol)}
                  helperText={errors.symbol}
                  placeholder="e.g., AAPL"
                  InputProps={{
                    sx: { textTransform: 'uppercase' }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="strategy-type-label">Strategy Type</InputLabel>
                  <Select
                    labelId="strategy-type-label"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    label="Strategy Type"
                  >
                    <MenuItem value="spread">Spread</MenuItem>
                    <MenuItem value="condor">Iron Condor</MenuItem>
                    <MenuItem value="butterfly">Butterfly</MenuItem>
                    <MenuItem value="straddle">Straddle</MenuItem>
                    <MenuItem value="strangle">Strangle</MenuItem>
                    <MenuItem value="calendar">Calendar Spread</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="direction-label">Direction</InputLabel>
                  <Select
                    labelId="direction-label"
                    name="direction"
                    value={formData.direction}
                    onChange={handleChange}
                    label="Direction"
                  >
                    <MenuItem value="bullish">Bullish</MenuItem>
                    <MenuItem value="bearish">Bearish</MenuItem>
                    <MenuItem value="neutral">Neutral</MenuItem>
                    <MenuItem value="volatility">Volatility</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Open Date"
                  value={formData.openDate}
                  onChange={(date) => handleDateChange('openDate', date)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: Boolean(errors.openDate),
                      helperText: errors.openDate
                    } 
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Expiration Date"
                  value={formData.expiration}
                  onChange={(date) => handleDateChange('expiration', date)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: Boolean(errors.expiration),
                      helperText: errors.expiration
                    } 
                  }}
                />
              </Grid>
            </Grid>
          )}
          
          {/* Step 2: Option Legs */}
          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  Option Legs
                </Typography>
                
                {errors.legs && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {errors.legs}
                  </Typography>
                )}
              </Grid>
              
              {/* Add new leg form */}
              <Grid item xs={12}>
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: alpha(theme.palette.background.default, 0.5),
                  borderRadius: 2
                }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="leg-type-label">Type</InputLabel>
                        <Select
                          labelId="leg-type-label"
                          name="type"
                          value={currentLeg.type}
                          onChange={handleLegChange}
                          label="Type"
                        >
                          <MenuItem value="call">Call</MenuItem>
                          <MenuItem value="put">Put</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="leg-direction-label">Direction</InputLabel>
                        <Select
                          labelId="leg-direction-label"
                          name="direction"
                          value={currentLeg.direction}
                          onChange={handleLegChange}
                          label="Direction"
                        >
                          <MenuItem value="long">Long</MenuItem>
                          <MenuItem value="short">Short</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        label="Strike"
                        name="strike"
                        value={currentLeg.strike}
                        onChange={handleLegChange}
                        fullWidth
                        size="small"
                        error={Boolean(legErrors.strike)}
                        helperText={legErrors.strike}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoneyIcon fontSize="small" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        label="Quantity"
                        name="quantity"
                        type="number"
                        value={currentLeg.quantity}
                        onChange={handleLegChange}
                        fullWidth
                        size="small"
                        error={Boolean(legErrors.quantity)}
                        helperText={legErrors.quantity}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        label="Premium"
                        name="premium"
                        value={currentLeg.premium}
                        onChange={handleLegChange}
                        fullWidth
                        size="small"
                        error={Boolean(legErrors.premium)}
                        helperText={legErrors.premium}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoneyIcon fontSize="small" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={2}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={handleAddLeg}
                        sx={{
                          background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                          boxShadow: '0 4px 8px rgba(33, 150, 243, 0.25)',
                          fontWeight: 600
                        }}
                      >
                        Add Leg
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Current legs */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Current Legs ({formData.legs.length})
                </Typography>
                
                {formData.legs.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    {formData.legs.map((leg, index) => (
                      <Paper 
                        key={leg.id} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: theme.palette.background.paper,
                          borderRadius: 2
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={`Leg ${index + 1}`} 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 2, fontWeight: 600 }}
                          />
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                            <Chip 
                              label={leg.type === 'call' ? 'CALL' : 'PUT'} 
                              size="small"
                              color={leg.type === 'call' ? 'primary' : 'secondary'}
                              sx={{ fontWeight: 500, mr: 1 }}
                            />
                            
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {leg.direction === 'long' ? (
                                <ArrowUpwardIcon fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
                              ) : (
                                <ArrowDownwardIcon fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
                              )}
                              <Typography variant="body2">
                                {leg.direction === 'long' ? 'Long' : 'Short'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" sx={{ mr: 2 }}>
                            Strike: <strong>{formatCurrency(leg.strike)}</strong>
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mr: 2 }}>
                            Qty: <strong>{leg.quantity}</strong>
                          </Typography>
                          
                          <Typography variant="body2">
                            Premium: <strong>{formatCurrency(leg.premium)}</strong>
                          </Typography>
                        </Box>
                        
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveLeg(leg.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                    
                    <Box sx={{ 
                      mt: 3, 
                      p: 2, 
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Strategy Summary
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        <Typography variant="body2">
                          Net Premium: <strong>{formatCurrency(calculateNetPremium())}</strong>
                        </Typography>
                        
                        <Typography variant="body2">
                          Total Legs: <strong>{formData.legs.length}</strong>
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No legs added yet. Use the form above to add option legs to your strategy.
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
          
          {/* Step 3: Risk Management */}
          {activeStep === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  Risk Management
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Maximum Loss"
                  name="maxLoss"
                  value={formData.maxLoss}
                  onChange={handleChange}
                  fullWidth
                  error={Boolean(errors.maxLoss)}
                  helperText={errors.maxLoss}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Maximum Profit"
                  name="maxProfit"
                  value={formData.maxProfit}
                  onChange={handleChange}
                  fullWidth
                  error={Boolean(errors.maxProfit)}
                  helperText={errors.maxProfit}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Break-Even Point"
                  name="breakEven"
                  value={formData.breakEven}
                  onChange={handleChange}
                  fullWidth
                  error={Boolean(errors.breakEven)}
                  helperText={errors.breakEven}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  mb: 1, 
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  Notes
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Strategy Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Add your strategy plan, exit criteria, or any other notes about this position..."
                />
              </Grid>
              
              {isEditMode && (
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
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
              )}
            </Grid>
          )}
        </LocalizationProvider>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
        >
          Cancel
        </Button>
        
        <Box sx={{ flex: '1 1 auto' }} />
        
        {activeStep > 0 && (
          <Button 
            onClick={handleBack}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button 
            onClick={handleNext}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
              boxShadow: '0 4px 8px rgba(33, 150, 243, 0.25)',
              fontWeight: 600
            }}
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
              boxShadow: '0 4px 8px rgba(33, 150, 243, 0.25)',
              fontWeight: 600
            }}
          >
            {isEditMode ? 'Update' : 'Add'} Strategy
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StrategyForm;
