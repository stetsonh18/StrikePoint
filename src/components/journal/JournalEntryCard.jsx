import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import dayjs from 'dayjs';

/**
 * JournalEntryCard Component
 * Displays a single journal entry in a card format
 */
const JournalEntryCard = ({ entry, onEdit, onDelete, onView }) => {
  const theme = useTheme();
  
  // Default values if entry is incomplete
  const {
    id,
    title = 'Untitled Entry',
    date = new Date(),
    symbol = '',
    tradeType = 'long',
    content = '',
    tags = [],
    result = null,
    type = 'stock'
  } = entry || {};
  
  // Determine if the trade was profitable
  const isProfitable = result > 0;
  const isLoss = result < 0;
  
  // Format the date
  const formattedDate = dayjs(date).format('MMM D, YYYY');
  
  // Determine the trade direction icon and color
  const getTradeTypeInfo = () => {
    switch(tradeType.toLowerCase()) {
      case 'long':
        return { 
          icon: <TrendingUpIcon fontSize="small" />, 
          color: theme.palette.success.main,
          label: 'Long'
        };
      case 'short':
        return { 
          icon: <TrendingDownIcon fontSize="small" />, 
          color: theme.palette.error.main,
          label: 'Short'
        };
      default:
        return { 
          icon: <TrendingUpIcon fontSize="small" />, 
          color: theme.palette.info.main,
          label: tradeType
        };
    }
  };
  
  const tradeTypeInfo = getTradeTypeInfo();
  
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
            {title}
          </Typography>
          
          {result !== null && (
            <Chip 
              label={`${isProfitable ? '+' : ''}${result.toFixed(2)}%`}
              color={isProfitable ? 'success' : isLoss ? 'error' : 'default'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          {symbol && (
            <Chip 
              label={symbol.toUpperCase()} 
              size="small" 
              sx={{ 
                fontWeight: 600,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main
              }} 
            />
          )}
          
          <Chip 
            icon={tradeTypeInfo.icon}
            label={tradeTypeInfo.label}
            size="small"
            sx={{ 
              backgroundColor: alpha(tradeTypeInfo.color, 0.1),
              color: tradeTypeInfo.color,
              fontWeight: 500
            }}
          />
          
          <Chip 
            label={type === 'stock' ? 'Stock' : 'Option'} 
            size="small"
            sx={{ 
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              fontWeight: 500
            }}
          />
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {content}
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
          {tags.map((tag, index) => (
            <Chip 
              key={index} 
              label={tag} 
              size="small" 
              variant="outlined"
              sx={{ 
                fontSize: '0.7rem',
                height: 22
              }}
            />
          ))}
        </Box>
      </CardContent>
      
      <Divider />
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {formattedDate}
        </Typography>
        
        <Box>
          {onView && (
            <IconButton 
              size="small" 
              onClick={() => onView(entry)}
              sx={{ color: theme.palette.info.main }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          
          <IconButton 
            size="small" 
            onClick={() => onEdit(entry)}
            sx={{ color: theme.palette.warning.main }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          
          <IconButton 
            size="small" 
            onClick={() => onDelete(id)}
            sx={{ color: theme.palette.error.main }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default JournalEntryCard;
