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
  FormHelperText,
  useTheme,
  alpha
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * OptionForm Component
 * Form for adding or editing option positions
 */
const OptionForm = ({ open, option, onClose, onSave, title = "Add Option Position" }) => {
  const theme = useTheme();
  const isEditMode = Boolean(option);
  
  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'call',
    strike: '',
    expiration: null,
    direction: 'long',
    quantity: 1,
    entryPrice: '',
    currentPrice: '',
    openDate: dayjs(),
    stopLoss: '',
    takeProfit: '',
    notes: '',
    status: 'open'
  });
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  // Initialize form with option data if editing
  useEffect(() => {
    if (option) {
      setFormData({
        ...option,
        openDate: option.openDate ? dayjs(option.openDate) : dayjs(),
        expiration: option.expiration ? dayjs(option.expiration) : null
      });
    } else {
      // Reset form for new option
      setFormData({
        symbol: '',
        type: 'call',
        strike: '',
        expiration: null,
        direction: 'long',
        quantity: 1,
        entryPrice: '',
        currentPrice: '',
        openDate: dayjs(),
        stopLoss: '',
        takeProfit: '',
        notes: '',
        status: 'open'
      });
    }
    
    // Reset errors
    setErrors({});
  }, [option, open]);
  
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
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.symbol) {
      newErrors.symbol = 'Symbol is required';
    }
    
    if (!formData.strike) {
      newErrors.strike = 'Strike price is required';
    } else if (isNaN(formData.strike)) {
      newErrors.strike = 'Strike price must be a number';
    }
    
    if (!formData.expiration) {
      newErrors.expiration = 'Expiration date is required';
    }
    
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(formData.quantity) || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    
    if (!formData.entryPrice) {
      newErrors.entryPrice = 'Entry price is required';
    } else if (isNaN(formData.entryPrice)) {
      newErrors.entryPrice = 'Entry price must be a number';
    }
    
    if (formData.stopLoss && isNaN(formData.stopLoss)) {
      newErrors.stopLoss = 'Stop loss must be a number';
    }
    
    if (formData.takeProfit && isNaN(formData.takeProfit)) {
      newErrors.takeProfit = 'Take profit must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      // Convert dates to ISO strings
      const formattedData = {
        ...formData,
        openDate: formData.openDate.toISOString(),
        expiration: formData.expiration.toISOString(),
        strike: parseFloat(formData.strike),
        quantity: parseInt(formData.quantity, 10),
        entryPrice: parseFloat(formData.entryPrice),
        currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : parseFloat(formData.entryPrice),
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
        takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : null
      };
      
      onSave(formattedData);
    }
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={3}>
            {/* Basic Option Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                mb: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                Option Details
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="option-type-label">Option Type</InputLabel>
                <Select
                  labelId="option-type-label"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  label="Option Type"
                >
                  <MenuItem value="call">Call</MenuItem>
                  <MenuItem value="put">Put</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Strike Price"
                name="strike"
                value={formData.strike}
                onChange={handleChange}
                fullWidth
                error={Boolean(errors.strike)}
                helperText={errors.strike}
                placeholder="e.g., 150.00"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            {/* Position Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                mb: 1, 
                mt: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                Position Details
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
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
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Quantity (Contracts)"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                error={Boolean(errors.quantity)}
                helperText={errors.quantity}
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Entry Price"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                fullWidth
                error={Boolean(errors.entryPrice)}
                helperText={errors.entryPrice}
                placeholder="e.g., 5.25"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  )
                }}
              />
              <FormHelperText>
                Price per contract
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            {/* Risk Management */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                mb: 1, 
                mt: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                Risk Management
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Current Price"
                name="currentPrice"
                value={formData.currentPrice}
                onChange={handleChange}
                fullWidth
                placeholder="e.g., 5.75"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  )
                }}
              />
              <FormHelperText>
                Leave blank to use entry price
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Stop Loss"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleChange}
                fullWidth
                error={Boolean(errors.stopLoss)}
                helperText={errors.stopLoss || "Optional"}
                placeholder="e.g., 2.50"
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
                label="Take Profit"
                name="takeProfit"
                value={formData.takeProfit}
                onChange={handleChange}
                fullWidth
                error={Boolean(errors.takeProfit)}
                helperText={errors.takeProfit || "Optional"}
                placeholder="e.g., 8.00"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            {/* Notes */}
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
                label="Trading Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                placeholder="Add your trading plan, strategy, or any other notes about this position..."
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
        </LocalizationProvider>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          sx={{
            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            boxShadow: '0 4px 8px rgba(33, 150, 243, 0.25)',
            fontWeight: 600
          }}
        >
          {isEditMode ? 'Update' : 'Add'} Option
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OptionForm;
