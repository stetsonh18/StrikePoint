import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Tooltip,
  Checkbox,
  TablePagination,
  TableSortLabel,
  useTheme,
  alpha
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import dayjs from 'dayjs';

/**
 * OptionTable Component
 * Displays a table of option positions with sorting, filtering, and pagination
 */
const OptionTable = ({ 
  options, 
  onEdit, 
  onDelete, 
  onView,
  onSelectOption,
  selectedOptions,
  showCheckboxes = false
}) => {
  const theme = useTheme();
  
  // State for sorting
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('openDate');
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Handle checkbox selection
  const handleSelectOption = (event, id) => {
    if (onSelectOption) {
      onSelectOption(id);
    }
  };
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Sort function
  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };
  
  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };
  
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };
  
  // Calculate P&L
  const calculatePnL = (option) => {
    if (!option.currentPrice || !option.entryPrice) return 0;
    
    const pnl = option.direction === 'long'
      ? (option.currentPrice - option.entryPrice) * option.quantity * 100
      : (option.entryPrice - option.currentPrice) * option.quantity * 100;
    
    return pnl;
  };
  
  // Calculate P&L percentage
  const calculatePnLPercentage = (option) => {
    if (!option.currentPrice || !option.entryPrice) return 0;
    
    const pnl = option.direction === 'long'
      ? ((option.currentPrice - option.entryPrice) / option.entryPrice) * 100
      : ((option.entryPrice - option.currentPrice) / option.entryPrice) * 100;
    
    return pnl;
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Empty rows
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - options.length) : 0;
  
  // Sorted and paginated options
  const sortedOptions = stableSort(options, getComparator(order, orderBy))
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer component={Paper} sx={{ 
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        backgroundColor: theme.palette.background.paper
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
              {showCheckboxes && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selectedOptions.length > 0 && selectedOptions.length < options.length}
                    checked={options.length > 0 && selectedOptions.length === options.length}
                    onChange={(event) => {
                      if (onSelectOption) {
                        if (event.target.checked) {
                          onSelectOption(options.map(option => option.id));
                        } else {
                          onSelectOption([]);
                        }
                      }
                    }}
                  />
                </TableCell>
              )}
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'symbol'}
                  direction={orderBy === 'symbol' ? order : 'asc'}
                  onClick={() => handleRequestSort('symbol')}
                >
                  Symbol
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'type'}
                  direction={orderBy === 'type' ? order : 'asc'}
                  onClick={() => handleRequestSort('type')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'strike'}
                  direction={orderBy === 'strike' ? order : 'asc'}
                  onClick={() => handleRequestSort('strike')}
                >
                  Strike
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'expiration'}
                  direction={orderBy === 'expiration' ? order : 'asc'}
                  onClick={() => handleRequestSort('expiration')}
                >
                  Expiration
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'direction'}
                  direction={orderBy === 'direction' ? order : 'asc'}
                  onClick={() => handleRequestSort('direction')}
                >
                  Direction
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'quantity'}
                  direction={orderBy === 'quantity' ? order : 'asc'}
                  onClick={() => handleRequestSort('quantity')}
                >
                  Quantity
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'entryPrice'}
                  direction={orderBy === 'entryPrice' ? order : 'asc'}
                  onClick={() => handleRequestSort('entryPrice')}
                >
                  Entry Price
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'currentPrice'}
                  direction={orderBy === 'currentPrice' ? order : 'asc'}
                  onClick={() => handleRequestSort('currentPrice')}
                >
                  Current Price
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'openDate'}
                  direction={orderBy === 'openDate' ? order : 'asc'}
                  onClick={() => handleRequestSort('openDate')}
                >
                  Open Date
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'pnl'}
                  direction={orderBy === 'pnl' ? order : 'asc'}
                  onClick={() => handleRequestSort('pnl')}
                >
                  P&L
                </TableSortLabel>
              </TableCell>
              
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {sortedOptions.map((option) => {
              const pnl = calculatePnL(option);
              const pnlPercentage = calculatePnLPercentage(option);
              const isSelected = selectedOptions && selectedOptions.includes(option.id);
              
              return (
                <TableRow 
                  key={option.id}
                  hover
                  selected={isSelected}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      cursor: 'pointer'
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                  {showCheckboxes && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isSelected}
                        onChange={(event) => handleSelectOption(event, option.id)}
                      />
                    </TableCell>
                  )}
                  
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {option.symbol}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={option.type === 'call' ? 'CALL' : 'PUT'} 
                      size="small"
                      color={option.type === 'call' ? 'primary' : 'secondary'}
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    {formatCurrency(option.strike)}
                  </TableCell>
                  
                  <TableCell>
                    {dayjs(option.expiration).format('MMM D, YYYY')}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {option.direction === 'long' ? (
                        <ArrowUpwardIcon fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
                      ) : (
                        <ArrowDownwardIcon fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
                      )}
                      <Typography variant="body2">
                        {option.direction === 'long' ? 'Long' : 'Short'}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    {option.quantity}
                  </TableCell>
                  
                  <TableCell>
                    {formatCurrency(option.entryPrice)}
                  </TableCell>
                  
                  <TableCell>
                    {formatCurrency(option.currentPrice)}
                  </TableCell>
                  
                  <TableCell>
                    {dayjs(option.openDate).format('MMM D, YYYY')}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: pnl >= 0 ? theme.palette.success.main : theme.palette.error.main,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {pnl >= 0 ? (
                          <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                        )}
                        {formatCurrency(Math.abs(pnl))}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: pnlPercentage >= 0 ? theme.palette.success.main : theme.palette.error.main,
                          fontWeight: 500
                        }}
                      >
                        {pnlPercentage >= 0 ? '+' : '-'}{Math.abs(pnlPercentage).toFixed(2)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      {onView && (
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => onView(option)} sx={{ color: theme.palette.info.main }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {onEdit && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEdit(option)} sx={{ color: theme.palette.warning.main }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {onDelete && (
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => onDelete(option.id)} sx={{ color: theme.palette.error.main }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={showCheckboxes ? 12 : 11} />
              </TableRow>
            )}
            
            {options.length === 0 && (
              <TableRow>
                <TableCell colSpan={showCheckboxes ? 12 : 11} sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No option positions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={options.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default OptionTable;
