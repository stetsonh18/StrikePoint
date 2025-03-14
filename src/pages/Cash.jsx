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
  Switch,
  FormControlLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// Icon imports
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EventIcon from '@mui/icons-material/Event';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/Receipt';

// Component imports
import TransactionsTable from '../components/cash/TransactionsTable';
import TransactionForm from '../components/cash/TransactionForm';

// Service imports
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, deleteTransactions } from '../services/cashService';

// Constants
const REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Cash Transactions Page Component
 * Displays and manages cash transactions with filtering and sorting capabilities
 */
const Cash = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [openForm, setOpenForm] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [showBalance, setShowBalance] = useState(true);
  const [hidePositionLinked, setHidePositionLinked] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, isBulk: false, ids: [] });

  // Data fetching
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching cash transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleOpenForm = () => {
    setEditingTransaction(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setOpenForm(true);
  };

  const handleDeleteTransaction = async (id) => {
    // Open confirmation dialog instead of deleting immediately
    setDeleteDialog({
      open: true,
      id: id,
      isBulk: false,
      ids: []
    });
  };

  const handleBulkDelete = async (ids) => {
    // Open confirmation dialog for bulk delete
    setDeleteDialog({
      open: true,
      id: null,
      isBulk: true,
      ids: ids
    });
  };

  // Function to confirm deletion after dialog confirmation
  const confirmDelete = async () => {
    try {
      if (deleteDialog.isBulk) {
        // Bulk delete
        await deleteTransactions(deleteDialog.ids);
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => !deleteDialog.ids.includes(transaction.id))
        );
        console.log(`${deleteDialog.ids.length} transactions deleted successfully`);
      } else {
        // Single delete
        await deleteTransaction(deleteDialog.id);
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => transaction.id !== deleteDialog.id)
        );
        console.log('Transaction deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting transaction(s):', error);
    } finally {
      // Close the dialog
      setDeleteDialog({ open: false, id: null, isBulk: false, ids: [] });
    }
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setDeleteDialog({ open: false, id: null, isBulk: false, ids: [] });
  };

  const handleSaveTransaction = async (transaction) => {
    try {
      if (transaction.id && transactions.some(t => t.id === transaction.id)) {
        // Update existing transaction
        await updateTransaction(transaction);
        setTransactions(prevTransactions => 
          prevTransactions.map(t => t.id === transaction.id ? transaction : t)
        );
      } else {
        // Add new transaction
        const newTransaction = await addTransaction(transaction);
        setTransactions(prevTransactions => [...prevTransactions, newTransaction]);
      }
      
      handleCloseForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
      // Could add error handling UI here
    }
  };

  // Filter and search handlers
  const handleFilterChange = (event) => {
    setFilterType(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleToggleBalance = () => {
    setShowBalance(!showBalance);
  };

  // Sorting handler
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter, sort, and search the transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      if (filterType === 'all') return true;
      return transaction.type === filterType;
    })
    .filter(transaction => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.type.toLowerCase().includes(searchLower)
      );
    })
    .filter(transaction => {
      if (!hidePositionLinked) return true;
      return !transaction.positionId;
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

  // Calculate account balance
  const accountBalance = transactions.reduce((balance, transaction) => {
    if (transaction.type === 'deposit') {
      return balance + transaction.amount;
    } else if (transaction.type === 'withdrawal') {
      return balance - transaction.amount;
    }
    return balance;
  }, 0);

  // Calculate total deposits and withdrawals
  const totalDeposits = transactions.reduce((total, transaction) => {
    if (transaction.type === 'deposit') {
      return total + transaction.amount;
    }
    return total;
  }, 0);

  const totalWithdrawals = transactions.reduce((total, transaction) => {
    if (transaction.type === 'withdrawal') {
      return total + transaction.amount;
    }
    return total;
  }, 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Cash Management
      </Typography>
      
      {/* Cash Summary */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Cash Summary
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total Deposits
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        ${(totalDeposits).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total Withdrawals
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        ${(totalWithdrawals).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" align="right">
                    Current Balance
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="bold" 
                    align="right"
                    sx={{ 
                      color: accountBalance >= 0 ? 'success.main' : 'error.main',
                      transition: 'opacity 0.3s ease',
                      opacity: showBalance ? 1 : 0
                    }}
                  >
                    {showBalance ? `$${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={handleToggleBalance}
                    sx={{ mt: 1, float: 'right' }}
                  >
                    {showBalance ? 'Hide Balance' : 'Show Balance'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Transactions Table */}
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 0, 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Table Header */}
            <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Transactions
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Filter Toggle */}
                <FormControlLabel
                  control={
                    <Switch 
                      checked={hidePositionLinked}
                      onChange={(e) => setHidePositionLinked(e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label="Hide position-linked transactions"
                  sx={{ 
                    mr: 1,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                      color: 'text.secondary'
                    }
                  }}
                />
                
                {/* Type Filter */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="filter-type-label">Filter By</InputLabel>
                  <Select
                    labelId="filter-type-label"
                    id="filter-type"
                    value={filterType}
                    label="Filter By"
                    onChange={handleFilterChange}
                  >
                    <MenuItem value="all">All Transactions</MenuItem>
                    <MenuItem value="deposit">Deposits Only</MenuItem>
                    <MenuItem value="withdrawal">Withdrawals Only</MenuItem>
                  </Select>
                </FormControl>
                
                {/* Search */}
                <TextField
                  size="small"
                  label="Search"
                  variant="outlined"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  sx={{ minWidth: 200 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                {/* Add Transaction Button */}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenForm}
                  sx={{ 
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0, 127, 255, 0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0, 127, 255, 0.3)'
                    }
                  }}
                >
                  Add Transaction
                </Button>
              </Box>
            </Box>
            
            {/* Empty State */}
            {filteredTransactions.length === 0 && !loading && (
              <Box sx={{ 
                py: 8, 
                px: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No transactions found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
                  {searchTerm || filterType !== 'all' || hidePositionLinked ? 
                    'Try adjusting your filters or search criteria.' : 
                    'Get started by adding your first cash transaction.'}
                </Typography>
                {!searchTerm && filterType === 'all' && !hidePositionLinked && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenForm}
                    sx={{ 
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(0, 127, 255, 0.2)',
                      '&:hover': {
                        boxShadow: '0 6px 16px rgba(0, 127, 255, 0.3)'
                      }
                    }}
                  >
                    Add Your First Transaction
                  </Button>
                )}
              </Box>
            )}
            
            {/* Transactions Table */}
            {(filteredTransactions.length > 0 || loading) && (
              <TransactionsTable 
                transactions={filteredTransactions}
                loading={loading}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onBulkDelete={handleBulkDelete}
                onSort={requestSort}
                sortConfig={sortConfig}
              />
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Cash Form Dialog */}
      {openForm && (
        <TransactionForm
          open={openForm}
          transaction={editingTransaction}
          onSubmit={handleSaveTransaction}
          onCancel={handleCloseForm}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            minWidth: 400
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 2
        }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: theme.palette.common.white }}>
            {deleteDialog.isBulk ? 'Confirm Bulk Delete' : 'Confirm Delete'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText id="alert-dialog-description" sx={{ color: 'text.secondary' }}>
            {deleteDialog.isBulk 
              ? `Are you sure you want to delete ${deleteDialog.ids.length} transactions? This action cannot be undone.`
              : `Are you sure you want to delete this transaction? This action cannot be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={cancelDelete} 
            variant="outlined"
            sx={{ 
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              '&:hover': {
                borderColor: theme.palette.text.primary,
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            variant="contained"
            color="error"
            sx={{ 
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.2)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(244, 67, 54, 0.3)'
              }
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Cash;