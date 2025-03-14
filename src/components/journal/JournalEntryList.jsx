import React from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Typography,
  IconButton,
  Chip,
  Skeleton,
  TableSortLabel,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
  Avatar,
  Stack,
  Paper,
  Badge
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import dayjs from 'dayjs';

// Icons
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import EventIcon from '@mui/icons-material/Event';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

/**
 * JournalEntryList Component
 * Displays a list of journal entries in different view modes (list, cards, calendar)
 */
const JournalEntryList = ({ 
  entries, 
  loading, 
  onView, 
  onEdit, 
  onDelete, 
  onSort,
  sortConfig,
  viewMode = 'list'
}) => {
  const theme = useTheme();

  // Helper function to render trade type icon
  const renderTradeTypeIcon = (tradeType) => {
    switch (tradeType) {
      case 'long':
        return <CallMadeIcon fontSize="small" sx={{ color: theme.palette.success.main }} />;
      case 'short':
        return <CallReceivedIcon fontSize="small" sx={{ color: theme.palette.error.main }} />;
      case 'call':
        return <TrendingUpIcon fontSize="small" sx={{ color: theme.palette.info.main }} />;
      case 'put':
        return <TrendingDownIcon fontSize="small" sx={{ color: theme.palette.warning.main }} />;
      default:
        return null;
    }
  };

  // Helper function to render profit/loss indicator
  const renderProfitLossIndicator = (pnl) => {
    const isProfit = pnl >= 0;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isProfit ? (
          <ArrowUpwardIcon fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
        ) : (
          <ArrowDownwardIcon fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
        )}
        <Typography 
          variant="body2" 
          sx={{ 
            color: isProfit ? theme.palette.success.main : theme.palette.error.main,
            fontWeight: 'medium'
          }}
        >
          ${Math.abs(pnl).toFixed(2)}
        </Typography>
      </Box>
    );
  };

  // Render loading skeletons
  if (loading) {
    return (
      <Box>
        {viewMode === 'list' ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>P&L</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={60} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={150} /></TableCell>
                    <TableCell><Skeleton width={120} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  }

  // No entries message
  if (entries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h6" color="text.secondary">
          No journal entries found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add your first journal entry to start tracking your trades
        </Typography>
      </Box>
    );
  }

  // List view
  if (viewMode === 'list') {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'date'}
                  direction={sortConfig.key === 'date' ? sortConfig.direction : 'asc'}
                  onClick={() => onSort('date')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'symbol'}
                  direction={sortConfig.key === 'symbol' ? sortConfig.direction : 'asc'}
                  onClick={() => onSort('symbol')}
                >
                  Symbol
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'tradeType'}
                  direction={sortConfig.key === 'tradeType' ? sortConfig.direction : 'asc'}
                  onClick={() => onSort('tradeType')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'strategy'}
                  direction={sortConfig.key === 'strategy' ? sortConfig.direction : 'asc'}
                  onClick={() => onSort('strategy')}
                >
                  Strategy
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'pnl'}
                  direction={sortConfig.key === 'pnl' ? sortConfig.direction : 'asc'}
                  onClick={() => onSort('pnl')}
                >
                  P&L
                </TableSortLabel>
              </TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow 
                key={entry.id}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    cursor: 'pointer'
                  },
                  transition: 'background-color 0.2s'
                }}
                onClick={() => onView(entry)}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EventIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
                    {dayjs(entry.date).format('MMM D, YYYY')}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {entry.symbol}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {renderTradeTypeIcon(entry.tradeType)}
                    <Typography variant="body2" sx={{ ml: 0.5, textTransform: 'capitalize' }}>
                      {entry.tradeType}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{entry.strategy}</TableCell>
                <TableCell>{renderProfitLossIndicator(entry.pnl)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {entry.tags.slice(0, 3).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ 
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontSize: '0.7rem'
                        }}
                      />
                    ))}
                    {entry.tags.length > 3 && (
                      <Chip
                        label={`+${entry.tags.length - 3}`}
                        size="small"
                        sx={{ 
                          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          fontSize: '0.7rem'
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(entry);
                      }}
                      sx={{ color: theme.palette.info.main }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(entry);
                      }}
                      sx={{ color: theme.palette.warning.main }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.id);
                      }}
                      sx={{ color: theme.palette.error.main }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // Card view
  if (viewMode === 'cards') {
    return (
      <Grid container spacing={3}>
        {entries.map((entry) => (
          <Grid item xs={12} sm={6} md={4} key={entry.id}>
            <Card 
              sx={{ 
                backgroundColor: '#1c2639',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
                  cursor: 'pointer'
                },
                position: 'relative',
                overflow: 'visible'
              }}
              onClick={() => onView(entry)}
            >
              {/* Status badge */}
              <Badge
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: 16,
                  '& .MuiBadge-badge': {
                    backgroundColor: entry.status === 'closed' 
                      ? theme.palette.success.main 
                      : theme.palette.warning.main,
                    color: '#fff',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                    padding: '0 8px',
                    borderRadius: '4px',
                    height: '22px',
                    minWidth: '60px'
                  }
                }}
                badgeContent={entry.status}
              />
              
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {entry.symbol}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {renderTradeTypeIcon(entry.tradeType)}
                    <Typography variant="body2" sx={{ ml: 0.5, textTransform: 'capitalize' }}>
                      {entry.tradeType}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Strategy
                    </Typography>
                    <Typography variant="body2">
                      {entry.strategy}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', display: 'block' }}>
                      P&L
                    </Typography>
                    {renderProfitLossIndicator(entry.pnl)}
                  </Box>
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <EventIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
                  <Typography variant="body2">
                    {dayjs(entry.date).format('MMM D, YYYY')}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                  <FormatQuoteIcon fontSize="small" sx={{ mr: 1, mt: 0.3, color: theme.palette.text.secondary }} />
                  <Typography variant="body2" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3
                  }}>
                    {entry.setupNotes}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                  {entry.tags.slice(0, 4).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{ 
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        fontSize: '0.7rem'
                      }}
                    />
                  ))}
                  {entry.tags.length > 4 && (
                    <Chip
                      label={`+${entry.tags.length - 4}`}
                      size="small"
                      sx={{ 
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                        color: theme.palette.secondary.main,
                        fontSize: '0.7rem'
                      }}
                    />
                  )}
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(entry);
                  }}
                  sx={{ color: theme.palette.warning.main }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  sx={{ color: theme.palette.error.main }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Calendar view (simplified for now)
  return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Typography variant="h6" color="text.secondary">
        Calendar View
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Calendar view is under development
      </Typography>
    </Box>
  );
};

export default JournalEntryList;
