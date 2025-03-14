import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  Skeleton,
  Checkbox,
  Tooltip,
  Button,
  Link
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icon imports
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';

/**
 * TransactionsTable Component
 * Displays a table of cash transactions with sorting, filtering, and row selection capabilities
 */
const TransactionsTable = ({ transactions, loading, onEdit, onDelete, onBulkDelete, onSort, sortConfig }) => {
  const theme = useTheme();
  const [selected, setSelected] = useState([]);

  // ===== Selection Handlers =====
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = transactions.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  // ===== Formatting Functions =====
  /**
   * Format a number as USD currency
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  /**
   * Format a date string
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ===== Helpers =====
  /**
   * Get the sort direction icon for a column
   */
  const getSortDirectionIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? 
      <ArrowUpwardIcon fontSize="small" /> : 
      <ArrowDownwardIcon fontSize="small" />;
  };

  /**
   * Get the color for transaction type
   */
  const getTransactionTypeColor = (type) => {
    return type === 'deposit' ? 'success' : 'error';
  };

  /**
   * Get the icon for position type
   */
  const getPositionTypeIcon = (positionType) => {
    if (!positionType) return null;
    
    switch(positionType) {
      case 'stock':
        return <ShowChartIcon fontSize="small" />;
      case 'option':
        return <TimelineIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // ===== Bulk Actions =====
  const handleBulkDelete = () => {
    onBulkDelete(selected);
    setSelected([]);
  };

  // ===== Render Functions =====
  /**
   * Render skeleton rows when loading
   */
  const renderSkeletonRows = () => {
    return Array(5).fill(0).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell padding="checkbox">
          <Checkbox disabled />
        </TableCell>
        {Array(6).fill(0).map((_, cellIndex) => (
          <TableCell key={`skeleton-cell-${cellIndex}`}>
            <Skeleton animation="wave" height={24} />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  /**
   * Render bulk action controls
   */
  const renderBulkActions = () => {
    if (selected.length === 0) return null;
    
    return (
      <Box sx={{ 
        p: 2, 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center',
        backgroundColor: 'rgba(33, 150, 243, 0.08)',
        borderRadius: 1
      }}>
        <Typography variant="body2" sx={{ mr: 2 }}>
          {selected.length} {selected.length === 1 ? 'transaction' : 'transactions'} selected
        </Typography>
        <Button 
          size="small" 
          variant="outlined" 
          color="error" 
          onClick={handleBulkDelete}
        >
          Delete Selected
        </Button>
      </Box>
    );
  };

  return (
    <>
      {renderBulkActions()}
      
      <TableContainer component={Paper} sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < transactions.length}
                  checked={transactions.length > 0 && selected.length === transactions.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell 
                onClick={() => onSort('date')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Date
                  {getSortDirectionIcon('date')}
                </Box>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell 
                onClick={() => onSort('amount')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Amount
                  {getSortDirectionIcon('amount')}
                </Box>
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Position</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => {
                const isItemSelected = isSelected(transaction.id);
                
                return (
                  <TableRow
                    hover
                    key={transaction.id}
                    selected={isItemSelected}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                      '&.Mui-selected': { backgroundColor: 'rgba(33, 150, 243, 0.08)' },
                      backgroundColor: transaction.type === 'deposit' 
                        ? 'rgba(76, 175, 80, 0.04)' 
                        : 'rgba(244, 67, 54, 0.04)'
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(event) => handleClick(event, transaction.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatDate(transaction.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={transaction.type === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL'}
                        color={getTransactionTypeColor(transaction.type)}
                        icon={transaction.type === 'deposit' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ 
                          fontWeight: 'medium',
                          color: transaction.type === 'deposit' ? theme.palette.success.main : theme.palette.error.main
                        }}
                      >
                        {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ReceiptIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                        <Typography variant="body2">
                          {transaction.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {transaction.positionId ? (
                        <Chip
                          size="small"
                          icon={getPositionTypeIcon(transaction.positionType)}
                          label={`${transaction.positionSymbol || ''} ${transaction.positionType || ''}`}
                          variant="outlined"
                          component={Link}
                          href={`/${transaction.positionType}s`}
                          clickable
                          sx={{ textTransform: 'uppercase' }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Transaction">
                        <IconButton 
                          size="small" 
                          sx={{ mr: 1 }}
                          onClick={() => onEdit(transaction)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Transaction">
                        <IconButton 
                          size="small"
                          onClick={() => onDelete(transaction.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default TransactionsTable;
