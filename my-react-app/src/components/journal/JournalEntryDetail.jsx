import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  IconButton,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import dayjs from 'dayjs';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import EventIcon from '@mui/icons-material/Event';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TimelineIcon from '@mui/icons-material/Timeline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PercentIcon from '@mui/icons-material/Percent';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * JournalEntryDetail Component
 * Displays detailed information about a journal entry
 */
const JournalEntryDetail = ({ open, entry, onClose, onEdit, onDelete }) => {
  const theme = useTheme();
  
  if (!entry) return null;
  
  // Helper function to render trade type icon
  const renderTradeTypeIcon = (tradeType) => {
    switch (tradeType) {
      case 'long':
        return <CallMadeIcon sx={{ color: theme.palette.success.main, mr: 1 }} />;
      case 'short':
        return <CallReceivedIcon sx={{ color: theme.palette.error.main, mr: 1 }} />;
      case 'call':
        return <ArrowUpwardIcon sx={{ color: theme.palette.info.main, mr: 1 }} />;
      case 'put':
        return <ArrowDownwardIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />;
      default:
        return null;
    }
  };
  
  // Helper function to format trade type label
  const formatTradeType = (tradeType) => {
    switch (tradeType) {
      case 'long':
        return 'Long Stock';
      case 'short':
        return 'Short Stock';
      case 'call':
        return 'Call Option';
      case 'put':
        return 'Put Option';
      case 'spread':
        return 'Option Spread';
      default:
        return tradeType;
    }
  };
  
  // Helper function to render profit/loss indicator
  const renderProfitLossIndicator = (pnl) => {
    const isProfit = pnl >= 0;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isProfit ? (
          <ArrowUpwardIcon sx={{ color: theme.palette.success.main, mr: 0.5 }} />
        ) : (
          <ArrowDownwardIcon sx={{ color: theme.palette.error.main, mr: 0.5 }} />
        )}
        <Typography 
          variant="body1" 
          sx={{ 
            color: isProfit ? theme.palette.success.main : theme.palette.error.main,
            fontWeight: 'bold'
          }}
        >
          ${Math.abs(pnl).toFixed(2)}
        </Typography>
      </Box>
    );
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1c2639',
          backgroundImage: 'linear-gradient(rgba(33, 150, 243, 0.05), rgba(33, 150, 243, 0))',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssignmentIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Journal Entry: {entry.symbol}
          </Typography>
        </Box>
        <Box>
          <IconButton 
            color="primary" 
            onClick={() => onEdit(entry)} 
            aria-label="edit"
            title="Edit Entry"
            sx={{ mr: 1 }}
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            color="error" 
            onClick={() => {
              onDelete(entry.id);
              onClose();
            }} 
            aria-label="delete"
            title="Delete Entry"
            sx={{ mr: 1 }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={onClose} 
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Header with key info */}
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 2, 
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShowChartIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Symbol</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{entry.symbol}</Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {renderTradeTypeIcon(entry.tradeType)}
                    <Box>
                      <Typography variant="caption" color="text.secondary">Trade Type</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {formatTradeType(entry.tradeType)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachMoneyIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">P&L</Typography>
                      {renderProfitLossIndicator(entry.pnl)}
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {entry.status === 'closed' ? (
                      <CheckCircleIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                    ) : (
                      <CancelIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'medium',
                          textTransform: 'capitalize',
                          color: entry.status === 'closed' ? theme.palette.success.main : theme.palette.warning.main
                        }}
                      >
                        {entry.status}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Trade Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 'bold', 
              mb: 2,
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.primary.main
            }}>
              <TimelineIcon sx={{ mr: 1 }} />
              Trade Details
            </Typography>
            
            <TableContainer component={Paper} sx={{ backgroundColor: '#1e2745' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '40%', color: theme.palette.text.secondary }}>
                      Strategy
                    </TableCell>
                    <TableCell>{entry.strategy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ color: theme.palette.text.secondary }}>
                      Date
                    </TableCell>
                    <TableCell>{dayjs(entry.date).format('MMMM D, YYYY')}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ color: theme.palette.text.secondary }}>
                      Quantity
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ color: theme.palette.text.secondary }}>
                      Entry Price
                    </TableCell>
                    <TableCell>${parseFloat(entry.entryPrice).toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ color: theme.palette.text.secondary }}>
                      Exit Price
                    </TableCell>
                    <TableCell>
                      {entry.exitPrice ? `$${parseFloat(entry.exitPrice).toFixed(2)}` : 'N/A'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ color: theme.palette.text.secondary }}>
                      P&L %
                    </TableCell>
                    <TableCell>
                      <Typography 
                        sx={{ 
                          color: parseFloat(entry.pnlPercent) >= 0 
                            ? theme.palette.success.main 
                            : theme.palette.error.main,
                          fontWeight: 'medium'
                        }}
                      >
                        {parseFloat(entry.pnlPercent).toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          {/* Tags */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 'bold', 
              mb: 2,
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.primary.main
            }}>
              <LocalOfferIcon sx={{ mr: 1 }} />
              Tags
            </Typography>
            
            <Paper sx={{ 
              p: 2, 
              backgroundColor: '#1e2745',
              minHeight: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignContent: 'flex-start'
            }}>
              {entry.tags.length > 0 ? (
                entry.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    sx={{ 
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags added
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Journal Notes */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 'bold', 
              mb: 2,
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.primary.main
            }}>
              <FormatQuoteIcon sx={{ mr: 1 }} />
              Journal Notes
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: '#1e2745' }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    color: theme.palette.info.main,
                    fontWeight: 'medium'
                  }}>
                    Setup Notes
                  </Typography>
                  <Typography variant="body2">
                    {entry.setupNotes || 'No setup notes added'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: '#1e2745' }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    color: theme.palette.info.main,
                    fontWeight: 'medium'
                  }}>
                    Execution Notes
                  </Typography>
                  <Typography variant="body2">
                    {entry.executionNotes || 'No execution notes added'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <LightbulbIcon sx={{ color: theme.palette.warning.main, mr: 1.5, mt: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ 
                        mb: 1, 
                        color: theme.palette.warning.main,
                        fontWeight: 'medium'
                      }}>
                        Lessons Learned
                      </Typography>
                      <Typography variant="body2">
                        {entry.lessonsLearned || 'No lessons learned added'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JournalEntryDetail;
