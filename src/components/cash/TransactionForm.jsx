/**
 * TransactionForm Component
 * 
 * Provides a form dialog for adding and editing cash transactions in StrikePoint.
 * Features transaction details input with validation.
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
  IconButton
} from '@mui/material';

// Date Picker Components
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// Utilities
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Default form data
const DEFAULT_FORM_DATA = {
  id: '',
  type: 'deposit',
  amount: '',
  date: dayjs(),
  description: '',
  positionId: null,
  positionType: null,
  positionSymbol: null
};

/**
 * TransactionForm - Form for creating and editing cash transactions
 * 
 * @param {boolean} open - Controls dialog visibility
 * @param {object} transaction - Transaction data for editing (null for new transactions)
 * @param {function} onSubmit - Callback for form submission
 * @param {function} onCancel - Callback for cancellation
 */
const TransactionForm = ({ open, transaction, onSubmit, onCancel }) => {
  // ===== Component State =====
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  const [errors, setErrors] = useState({});
  
  // ===== Effects =====
  /**
   * Initialize form with transaction data if editing, or reset if adding new
   */
  useEffect(() => {
    if (transaction) {
      setFormData({
        ...transaction,
        date: dayjs(transaction.date)
      });
    } else {
      // Reset form for new transaction
      setFormData({
        ...DEFAULT_FORM_DATA,
        id: uuidv4() // Generate new UUID for new transactions
      });
    }
    // Reset errors
    setErrors({});
  }, [transaction]);

  // ===== Event Handlers =====
  /**
   * Handle form input changes for text/select fields
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  /**
   * Handle date picker changes
   */
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date
    }));
    
    // Clear error for this field if it exists
    if (errors.date) {
      setErrors(prev => ({
        ...prev,
        date: null
      }));
    }
  };

  /**
   * Validate the form data
   */
  const validateForm = () => {
    const newErrors = {};
    
    // Check amount
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    // Check date
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    // Check type
    if (!formData.type) {
      newErrors.type = 'Transaction type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission with validation
   */
  const handleSubmit = () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission - convert strings to numbers and format dates
    const submissionData = {
      ...formData,
      amount: Number(formData.amount),
      date: formData.date.toISOString()
    };

    onSubmit(submissionData);
  };

  // ===== Main Component Render =====
  return (
    <Dialog 
      open={open} 
      onClose={onCancel}
      maxWidth="sm"
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
          {transaction ? 'Edit Transaction' : 'Add New Transaction'}
        </Typography>
        <IconButton onClick={onCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      {/* Form Content */}
      <DialogContent sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Transaction Type */}
          <Grid item xs={12}>
            <FormControl fullWidth required error={!!errors.type}>
              <InputLabel id="transaction-type-label">Transaction Type</InputLabel>
              <Select
                labelId="transaction-type-label"
                name="type"
                value={formData.type}
                onChange={handleChange}
                label="Transaction Type"
                startAdornment={
                  formData.type === 'deposit' ? 
                    <ArrowUpwardIcon color="success" sx={{ ml: 1, mr: 1 }} /> : 
                    <ArrowDownwardIcon color="error" sx={{ ml: 1, mr: 1 }} />
                }
              >
                <MenuItem value="deposit">Deposit</MenuItem>
                <MenuItem value="withdrawal">Withdrawal</MenuItem>
              </Select>
              {errors.type && (
                <Typography variant="caption" color="error">
                  {errors.type}
                </Typography>
              )}
            </FormControl>
          </Grid>
          
          {/* Amount */}
          <Grid item xs={12}>
            <TextField
              label="Amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              fullWidth
              required
              type="number"
              inputProps={{ step: 0.01, min: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              error={!!errors.amount}
              helperText={errors.amount || ''}
            />
          </Grid>
          
          {/* Date */}
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Transaction Date"
                value={formData.date}
                onChange={handleDateChange}
                slotProps={{
                  textField: { 
                    fullWidth: true, 
                    required: true,
                    error: !!errors.date,
                    helperText: errors.date || ''
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Description */}
          <Grid item xs={12}>
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Monthly deposit, Withdrawal for taxes, etc."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                    <ReceiptIcon />
                  </InputAdornment>
                ),
                sx: { pl: 0 }
              }}
            />
          </Grid>
        </Grid>
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
          {transaction ? 'Update Transaction' : 'Add Transaction'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionForm;
