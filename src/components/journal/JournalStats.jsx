import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';

// Icons
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CategoryIcon from '@mui/icons-material/Category';

/**
 * JournalStats Component
 * Displays statistics about journal entries
 */
const JournalStats = ({ stats, loading }) => {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Calculate win rate percentage
  const winRate = stats.closedPositions > 0 
    ? Math.round((stats.profitableTrades / stats.closedPositions) * 100) 
    : 0;
  
  // Stat items to display
  const statItems = [
    {
      title: 'Total Entries',
      value: stats.totalEntries,
      icon: <AssignmentIcon />,
      color: theme.palette.primary.main
    },
    {
      title: 'Closed Positions',
      value: stats.closedPositions,
      icon: <CheckCircleIcon />,
      color: theme.palette.success.main
    },
    {
      title: 'Open Positions',
      value: stats.openPositions,
      icon: <PendingIcon />,
      color: theme.palette.warning.main
    },
    {
      title: 'Strategies Used',
      value: stats.strategiesUsed,
      icon: <CategoryIcon />,
      color: theme.palette.info.main
    },
    {
      title: 'Profitable Trades',
      value: stats.profitableTrades,
      icon: <TrendingUpIcon />,
      color: theme.palette.success.main
    },
    {
      title: 'Unprofitable Trades',
      value: stats.unprofitableTrades,
      icon: <TrendingDownIcon />,
      color: theme.palette.error.main
    }
  ];
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2, 
        backgroundColor: '#1e2745',
        borderRadius: 2,
        mb: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
          Journal Statistics
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {statItems.map((item, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backgroundColor: alpha(item.color, 0.05),
                border: `1px solid ${alpha(item.color, 0.1)}`,
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(item.color, 0.2)}`
                }
              }}
            >
              <Box 
                sx={{ 
                  color: item.color,
                  mb: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: alpha(item.color, 0.1)
                }}
              >
                {item.icon}
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: item.color }}>
                {item.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {item.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {stats.closedPositions > 0 && (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.background.paper, 0.5) }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            Win Rate
          </Typography>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                width: '100%', 
                height: 10, 
                backgroundColor: alpha(theme.palette.error.main, 0.2),
                borderRadius: 5
              }}
            >
              <Box 
                sx={{ 
                  width: `${winRate}%`, 
                  height: '100%', 
                  backgroundColor: theme.palette.success.main,
                  borderRadius: 5,
                  transition: 'width 1s ease-in-out'
                }}
              />
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                position: 'absolute', 
                right: 0, 
                top: -22, 
                fontWeight: 'bold',
                color: winRate >= 50 ? theme.palette.success.main : theme.palette.error.main
              }}
            >
              {winRate}%
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default JournalStats;
