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
  Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icon imports
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CallIcon from '@mui/icons-material/Call';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import LayersIcon from '@mui/icons-material/Layers';
import EventIcon from '@mui/icons-material/Event';

/**
 * OptionsTable Component
 * Displays a table of option positions with sorting, filtering, and row selection capabilities
 * Includes real-time price updates and P&L calculations
 * Supports both single-leg and multi-leg option strategies
 */
const OptionsTable = ({ positions, loading, onEdit, onDelete, onSort, sortConfig }) => {
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
   * Get the sort direction icon for a column
   */
  const getSortDirectionIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? 
      <ArrowUpwardIcon fontSize="small" /> : 
      <ArrowDownwardIcon fontSize="small" />;
  };

  /**
   * Get the color for P&L values
   */
  const getProfitLossColor = (value) => {
    if (value > 0) return theme.palette.success.main;
    if (value < 0) return theme.palette.error.main;
    return theme.palette.text.primary;
  };

  /**
   * Get the appropriate icon for option type
   */
  const getOptionTypeIcon = (type, direction) => {
    if (type === 'multi-leg') return <LayersIcon fontSize="small" />;
    if (type === 'call') return <CallIcon fontSize="small" />;
    return <PhoneMissedIcon fontSize="small" />;
  };

  /**
   * Get the color for option type chip
   */
  const getOptionTypeColor = (type) => {
    if (type === 'multi-leg') return 'warning';
    if (type === 'call') return 'primary';
    return 'secondary';
  };

  /**
   * Get the color for direction chip
   */
  const getDirectionColor = (direction) => {
    return direction === 'long' ? 'success' : 'error';
  };

  /**
   * Get the color for status chip
   */
  const getStatusColor = (status) => {
    return status === 'open' ? 'info' : 'default';
  };

  /**
   * Calculate days until expiration
   */
  const getDaysUntilExpiration = (expirationDate) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = Math.abs(expDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  /**
   * Get expiration status and color
   */
  const getExpirationStatus = (expirationDate) => {
    const daysLeft = getDaysUntilExpiration(expirationDate);
    
    if (daysLeft <= 7) {
      return { text: `${daysLeft}d (Critical)`, color: 'error' };
    } else if (daysLeft <= 30) {
      return { text: `${daysLeft}d (Warning)`, color: 'warning' };
    } else {
      return { text: `${daysLeft}d`, color: 'success' };
    }
  };

  // ===== Bulk Actions =====
  const handleBulkClose = () => {
    // Implementation would go here
    setSelected([]);
  };

  const handleBulkDelete = () => {
    // Implementation would go here
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
        {Array(9).fill(0).map((_, cellIndex) => (
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
          {selected.length} {selected.length === 1 ? 'position' : 'positions'} selected
        </Typography>
        <Button 
          size="small" 
          variant="outlined" 
          color="primary" 
          onClick={handleBulkClose}
          sx={{ mr: 1 }}
        >
          Close Selected
        </Button>
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
                  indeterminate={selected.length > 0 && selected.length < positions.length}
                  checked={positions.length > 0 && selected.length === positions.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell 
                onClick={() => onSort('symbol')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Symbol
                  {getSortDirectionIcon('symbol')}
                </Box>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell 
                onClick={() => onSort('quantity')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Quantity
                  {getSortDirectionIcon('quantity')}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => onSort('entryPrice')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Entry Price
                  {getSortDirectionIcon('entryPrice')}
                </Box>
              </TableCell>
              <TableCell>Current Price</TableCell>
              <TableCell 
                onClick={() => onSort('entryDate')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Entry Date
                  {getSortDirectionIcon('entryDate')}
                </Box>
              </TableCell>
              <TableCell>Expiration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell 
                onClick={() => onSort('profitLoss')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  P&L
                  {getSortDirectionIcon('profitLoss')}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => onSort('profitLossPercentage')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  P&L %
                  {getSortDirectionIcon('profitLossPercentage')}
                </Box>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No option positions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => {
                const isItemSelected = isSelected(position.id);
                const expirationStatus = getExpirationStatus(position.expirationDate);
                
                return (
                  <TableRow
                    hover
                    key={position.id}
                    selected={isItemSelected}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                      '&.Mui-selected': { backgroundColor: 'rgba(33, 150, 243, 0.08)' }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(event) => handleClick(event, position.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {position.symbol}
                      </Typography>
                      {position.optionType === 'multi-leg' && position.strategyType && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {position.strategyType}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={position.optionType === 'multi-leg' ? 'Multi-Leg' : position.optionType.toUpperCase()}
                        color={getOptionTypeColor(position.optionType)}
                        icon={getOptionTypeIcon(position.optionType)}
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={position.direction.toUpperCase()}
                        color={getDirectionColor(position.direction)}
                        variant="outlined"
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>
                      {position.quantity} {position.optionType !== 'multi-leg' ? 'contract' : 'strategy'}
                      {position.quantity > 1 && 's'}
                    </TableCell>
                    <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                    <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                    <TableCell>{formatDate(position.entryDate)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EventIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette[expirationStatus.color].main }} />
                        <Tooltip title={`Expires on ${formatDate(position.expirationDate)}`}>
                          <Chip
                            size="small"
                            label={expirationStatus.text}
                            color={expirationStatus.color}
                            variant="outlined"
                          />
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={position.status.toUpperCase()}
                        color={getStatusColor(position.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: getProfitLossColor(position.profitLoss), fontWeight: 'medium' }}
                      >
                        {formatCurrency(position.profitLoss)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: getProfitLossColor(position.profitLossPercentage), fontWeight: 'medium' }}
                      >
                        {formatPercentage(position.profitLossPercentage)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" sx={{ mr: 1 }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Position">
                        <IconButton 
                          size="small" 
                          sx={{ mr: 1 }}
                          onClick={() => onEdit(position)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Position">
                        <IconButton 
                          size="small"
                          onClick={() => onDelete(position.id)}
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

export default OptionsTable;
