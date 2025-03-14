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
  Toolbar,
  alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icon imports
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

/**
 * StockTable Component
 * Displays a table of stock positions with sorting, filtering, and row selection capabilities
 * Includes real-time price updates and P&L calculations
 */
const StockTable = ({ positions, loading, onEdit, onDelete, onSort, sortConfig, onBulkDelete }) => {
  const theme = useTheme();
  const [selected, setSelected] = useState([]);

  // ===== Selection Handlers =====
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = positions.map((n) => n.id);
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
   * Format a decimal as a percentage
   */
  const formatPercentage = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
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
   * Get the appropriate sort direction icon based on current sort config
   */
  const getSortDirectionIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? (
      <ArrowUpwardIcon fontSize="small" sx={{ fontSize: 16, ml: 0.5 }} />
    ) : (
      <ArrowDownwardIcon fontSize="small" sx={{ fontSize: 16, ml: 0.5 }} />
    );
  };

  /**
   * Calculate Profit/Loss for a position
   */
  const calculatePL = (position) => {
    if (position.status === 'closed') return position.profitLoss;
    
    const currentValue = position.currentPrice * position.quantity;
    const entryValue = position.entryPrice * position.quantity;
    
    return position.direction === 'long'
      ? currentValue - entryValue
      : entryValue - currentValue;
  };

  /**
   * Calculate Profit/Loss percentage for a position
   */
  const calculatePLPercentage = (position) => {
    if (position.status === 'closed') return position.profitLossPercentage;
    
    const pl = calculatePL(position);
    const entryValue = position.entryPrice * position.quantity;
    
    return (pl / entryValue) * 100;
  };

  // ===== Table Headers =====
  /**
   * Defines sortable column configurations
   */
  const columns = [
    { id: 'symbol', label: 'Symbol', sortable: true },
    { id: 'direction', label: 'Direction', sortable: true },
    { id: 'quantity', label: 'Quantity', sortable: true },
    { id: 'entryPrice', label: 'Entry Price', sortable: true },
    { id: 'currentPrice', label: 'Current Price', sortable: false },
    { id: 'entryDate', label: 'Entry Date', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'profitLoss', label: 'P&L', sortable: true },
    { id: 'profitLossPercentage', label: 'P&L %', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false }
  ];

  // ===== Table States =====
  // Loading skeleton view
  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="stock positions table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Skeleton variant="rectangular" width={24} height={24} />
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.id}>{column.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={24} height={24} />
                </TableCell>
                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                <TableCell><Skeleton variant="text" width={80} /></TableCell>
                <TableCell><Skeleton variant="text" width={80} /></TableCell>
                <TableCell><Skeleton variant="text" width={100} /></TableCell>
                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                <TableCell><Skeleton variant="text" width={80} /></TableCell>
                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                <TableCell><Skeleton variant="text" width={120} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // Empty state view
  if (positions.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No stock positions found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first stock position to get started.
        </Typography>
      </Box>
    );
  }

  // Main table view
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Table Toolbar */}
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(selected.length > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {selected.length > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {selected.length} selected
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Stock Positions
          </Typography>
        )}

        {selected.length > 0 && (
          <Tooltip title="Delete">
            <IconButton onClick={() => onBulkDelete(selected)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="stock positions table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < positions.length}
                  checked={positions.length > 0 && selected.length === positions.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              
              {columns.map((column) => (
                <TableCell 
                  key={column.id}
                  onClick={() => column.sortable && onSort(column.id)}
                  sx={column.sortable ? { 
                    cursor: 'pointer', 
                    '&:hover': { color: theme.palette.primary.main } 
                  } : {}}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {column.label}
                    {column.sortable && getSortDirectionIcon(column.id)}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((position) => {
              const isItemSelected = isSelected(position.id);
              const pl = calculatePL(position);
              const plPercentage = calculatePLPercentage(position);
              
              return (
                <TableRow
                  hover
                  onClick={(event) => handleClick(event, position.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  key={position.id}
                  selected={isItemSelected}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(0, 168, 255, 0.08)' },
                    backgroundColor: pl > 0 
                      ? 'rgba(0, 209, 102, 0.08)'
                      : pl < 0 
                        ? 'rgba(255, 59, 95, 0.08)'
                        : 'inherit'
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {position.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={position.direction === 'long' ? 'Long' : 'Short'}
                      color={position.direction === 'long' ? 'success' : 'error'}
                      size="small"
                      sx={{ minWidth: 60 }}
                    />
                  </TableCell>
                  <TableCell>{position.quantity}</TableCell>
                  <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                  <TableCell>
                    {position.status === 'open' 
                      ? formatCurrency(position.currentPrice)
                      : position.exitPrice ? formatCurrency(position.exitPrice) : '-'
                    }
                  </TableCell>
                  <TableCell>{formatDate(position.entryDate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={position.status === 'open' ? 'Open' : 'Closed'}
                      color={position.status === 'open' ? 'primary' : 'default'}
                      size="small"
                      sx={{ minWidth: 60 }}
                    />
                  </TableCell>
                  <TableCell sx={{ 
                    color: pl > 0 
                      ? theme.palette.success.main 
                      : pl < 0 
                        ? theme.palette.error.main 
                        : 'inherit'
                  }}>
                    {formatCurrency(pl)}
                  </TableCell>
                  <TableCell sx={{ 
                    color: plPercentage > 0 
                      ? theme.palette.success.main 
                      : plPercentage < 0 
                        ? theme.palette.error.main 
                        : 'inherit'
                  }}>
                    {formatPercentage(plPercentage)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          // Handle view action
                        }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit position">
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          onEdit(position);
                        }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete position">
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          onDelete(position.id);
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default StockTable;
