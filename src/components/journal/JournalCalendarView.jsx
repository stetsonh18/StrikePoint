import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Badge,
  Paper,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import dayjs from 'dayjs';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * JournalCalendarView Component
 * Displays journal entries in a calendar view
 */
const JournalCalendarView = ({ entries = [], onSelectEntry }) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  
  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };
  
  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };
  
  // Get days in month
  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfMonth = currentMonth.startOf('month').day(); // 0 = Sunday, 1 = Monday, etc.
  
  // Get entries for the current month
  const entriesInMonth = entries.filter(entry => {
    const entryDate = dayjs(entry.date);
    return entryDate.month() === currentMonth.month() && entryDate.year() === currentMonth.year();
  });
  
  // Group entries by day
  const entriesByDay = entriesInMonth.reduce((acc, entry) => {
    const day = dayjs(entry.date).date();
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(entry);
    return acc;
  }, {});
  
  // Calculate profit/loss for each day
  const profitLossByDay = Object.keys(entriesByDay).reduce((acc, day) => {
    const dayEntries = entriesByDay[day];
    const totalPnL = dayEntries.reduce((sum, entry) => {
      return sum + (entry.result || 0);
    }, 0);
    acc[day] = totalPnL;
    return acc;
  }, {});
  
  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  // Calculate total weeks needed (to fill the grid)
  const totalWeeks = Math.ceil(calendarDays.length / 7);
  const totalCells = totalWeeks * 7;
  
  // Add empty cells for days after the last day of the month
  while (calendarDays.length < totalCells) {
    calendarDays.push(null);
  }
  
  // Split days into weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  
  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Calendar Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <IconButton onClick={handlePrevMonth}>
          <ChevronLeftIcon />
        </IconButton>
        
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {currentMonth.format('MMMM YYYY')}
        </Typography>
        
        <IconButton onClick={handleNextMonth}>
          <ChevronRightIcon />
        </IconButton>
      </Box>
      
      {/* Day Names */}
      <Grid container sx={{ mb: 1 }}>
        {dayNames.map((day, index) => (
          <Grid item xs key={index} sx={{ textAlign: 'center' }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                color: theme.palette.text.secondary
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
      
      {/* Calendar Grid */}
      <Box sx={{ mb: 3 }}>
        {weeks.map((week, weekIndex) => (
          <Grid container key={weekIndex} spacing={1} sx={{ mb: 1 }}>
            {week.map((day, dayIndex) => {
              // Empty cell
              if (day === null) {
                return (
                  <Grid item xs key={`empty-${weekIndex}-${dayIndex}`}>
                    <Box 
                      sx={{ 
                        height: 100, 
                        backgroundColor: alpha(theme.palette.background.default, 0.5),
                        borderRadius: 1
                      }}
                    />
                  </Grid>
                );
              }
              
              const dayEntries = entriesByDay[day] || [];
              const hasEntries = dayEntries.length > 0;
              const dayPnL = profitLossByDay[day] || 0;
              const isProfitable = dayPnL > 0;
              const isLoss = dayPnL < 0;
              
              // Current day
              const isCurrentDay = dayjs().date() === day && 
                                  dayjs().month() === currentMonth.month() && 
                                  dayjs().year() === currentMonth.year();
              
              return (
                <Grid item xs key={`day-${day}`}>
                  <Paper 
                    sx={{ 
                      height: 100, 
                      p: 1,
                      backgroundColor: isCurrentDay 
                        ? alpha(theme.palette.primary.main, 0.1) 
                        : theme.palette.background.paper,
                      border: isCurrentDay 
                        ? `1px solid ${theme.palette.primary.main}` 
                        : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      borderRadius: 1,
                      cursor: hasEntries ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      '&:hover': hasEntries ? {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      } : {},
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => hasEntries && dayEntries.length === 1 ? onSelectEntry(dayEntries[0]) : null}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 0.5
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isCurrentDay ? 700 : 600,
                          color: isCurrentDay ? theme.palette.primary.main : theme.palette.text.primary
                        }}
                      >
                        {day}
                      </Typography>
                      
                      {hasEntries && (
                        <Badge 
                          badgeContent={dayEntries.length} 
                          color="primary"
                          sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}
                        />
                      )}
                    </Box>
                    
                    {hasEntries && (
                      <>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          mb: 0.5
                        }}>
                          {isProfitable ? (
                            <TrendingUpIcon fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
                          ) : isLoss ? (
                            <TrendingDownIcon fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
                          ) : null}
                          
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: isProfitable 
                                ? theme.palette.success.main 
                                : isLoss 
                                  ? theme.palette.error.main 
                                  : theme.palette.text.secondary,
                              fontWeight: 600
                            }}
                          >
                            {isProfitable ? '+' : ''}{dayPnL.toFixed(2)}%
                          </Typography>
                        </Box>
                        
                        <Box sx={{ overflow: 'hidden' }}>
                          {dayEntries.slice(0, 2).map((entry, index) => (
                            <Tooltip key={index} title={entry.title}>
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  mb: 0.25,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 500,
                                    color: theme.palette.text.secondary,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {entry.symbol && `${entry.symbol}: `}{entry.title}
                                </Typography>
                              </Box>
                            </Tooltip>
                          ))}
                          
                          {dayEntries.length > 2 && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: theme.palette.text.secondary,
                                fontStyle: 'italic'
                              }}
                            >
                              +{dayEntries.length - 2} more
                            </Typography>
                          )}
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ))}
      </Box>
    </Box>
  );
};

export default JournalCalendarView;
