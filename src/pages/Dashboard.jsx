import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Paper, 
  Button, 
  IconButton, 
  Divider, 
  List,
  ListItem,
  ButtonGroup,
  Chip,
  Avatar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BarChartIcon from '@mui/icons-material/BarChart';
import ReactApexChart from 'react-apexcharts';

// Icons
const CashIcon = AttachMoneyIcon;
const StatsIcon = EqualizerIcon;
const ViewIcon = VisibilityIcon;
const StockIcon = ShowChartIcon;
const OptionIcon = TimelineIcon;

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const handleNavigation = (path) => {
    navigate(path);
  };
  
  // Sample data for charts
  const performanceData = [
    { x: '01/01/2025', y: 100 },
    { x: '01/15/2025', y: 120 },
    { x: '02/01/2025', y: 180 },
    { x: '02/15/2025', y: 250 },
    { x: '03/01/2025', y: 350 },
    { x: '03/15/2025', y: 420 },
    { x: '04/01/2025', y: 380 },
    { x: '04/15/2025', y: 350 },
    { x: '05/01/2025', y: 320 },
    { x: '05/15/2025', y: 280 },
    { x: '06/01/2025', y: 250 }
  ];
  
  const performanceChartOptions = {
    chart: {
      type: 'area',
      height: 250,
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#2196f3'],
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      type: 'category',
      labels: {
        style: {
          colors: theme.palette.text.secondary
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary
        },
        formatter: (value) => `$${value.toFixed(2)}`
      }
    },
    tooltip: {
      x: {
        format: 'dd/MM/yy'
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.1)',
      strokeDashArray: 3
    },
    legend: {
      labels: {
        colors: theme.palette.text.primary
      }
    }
  };
  
  // Donut chart data
  const tradeTypeData = [11, 66, 23];
  const tradeTypeOptions = {
    chart: {
      type: 'donut',
      background: 'transparent'
    },
    colors: ['#00a8ff', '#9c27b0', '#ff9800'],
    labels: ['Stocks', 'Single Options', 'Multi-Leg Options'],
    legend: {
      show: false
    },
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%'
        }
      }
    }
  };
  
  const directionData = [17, 83];
  const directionOptions = {
    chart: {
      type: 'donut',
      background: 'transparent'
    },
    colors: ['#00d166', '#ff3b5f'],
    labels: ['Long', 'Short'],
    legend: {
      show: false
    },
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%'
        }
      }
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Dashboard Header */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Dashboard
      </Typography>
      
      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Account Value */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: theme.palette.primary.main,
                background: 'linear-gradient(90deg, #2196f3, #21cbf3)',
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Account Value
              </Typography>
              <IconButton size="small">
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              $42,568.92
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                icon={<TrendingUpIcon />} 
                label="↑ 2.4%" 
                size="small" 
                sx={{ 
                  backgroundColor: 'rgba(0, 200, 83, 0.1)', 
                  color: '#00c853',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Today
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* P&L */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: '#00c853',
                background: 'linear-gradient(90deg, #00c853, #69f0ae)',
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total P&L
              </Typography>
              <IconButton size="small">
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              +$8,245.67
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                icon={<TrendingUpIcon />} 
                label="↑ 19.4%" 
                size="small" 
                sx={{ 
                  backgroundColor: 'rgba(0, 200, 83, 0.1)', 
                  color: '#00c853',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                All time
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Open Positions */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: '#ff9800',
                background: 'linear-gradient(90deg, #ff9800, #ffc107)',
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Open Positions
              </Typography>
              <IconButton size="small">
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              24
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label="12 Stocks" 
                size="small" 
                sx={{ 
                  backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                  color: '#2196f3',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }} 
              />
              <Chip 
                label="8 Options" 
                size="small" 
                sx={{ 
                  backgroundColor: 'rgba(156, 39, 176, 0.1)', 
                  color: '#9c27b0',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }} 
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Win Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: '#9c27b0',
                background: 'linear-gradient(90deg, #9c27b0, #d500f9)',
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Win Rate
              </Typography>
              <IconButton size="small">
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              68.5%
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                icon={<TrendingUpIcon />} 
                label="↑ 3.2%" 
                size="small" 
                sx={{ 
                  backgroundColor: 'rgba(0, 200, 83, 0.1)', 
                  color: '#00c853',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Last 30 days
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Performance Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Performance
              </Typography>
              <ButtonGroup size="small" aria-label="time period">
                <Button>1D</Button>
                <Button>1W</Button>
                <Button>1M</Button>
                <Button variant="contained">3M</Button>
                <Button>1Y</Button>
                <Button>All</Button>
              </ButtonGroup>
            </Box>
            <ReactApexChart 
              options={performanceChartOptions} 
              series={[{ name: 'Account Value', data: performanceData.map(d => d.y) }]} 
              type="area" 
              height={350} 
            />
          </Paper>
        </Grid>
        
        {/* Analytics */}
        <Grid item xs={12} lg={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Trade Analytics
            </Typography>
            
            <Grid container spacing={2}>
              {/* Trade Type Distribution */}
              <Grid item xs={12} sm={6} lg={12}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Trade Type Distribution
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '50%', height: 150 }}>
                      <ReactApexChart 
                        options={tradeTypeOptions} 
                        series={tradeTypeData} 
                        type="donut" 
                        height={150} 
                      />
                    </Box>
                    <Box sx={{ width: '50%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#00a8ff', mr: 1 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>Stocks</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>11%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#9c27b0', mr: 1 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>Single Options</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>66%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff9800', mr: 1 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>Multi-Leg</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>23%</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              
              {/* Direction Distribution */}
              <Grid item xs={12} sm={6} lg={12}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Direction Distribution
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '50%', height: 150 }}>
                      <ReactApexChart 
                        options={directionOptions} 
                        series={directionData} 
                        type="donut" 
                        height={150} 
                      />
                    </Box>
                    <Box sx={{ width: '50%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#00d166', mr: 1 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>Long</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>17%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff3b5f', mr: 1 }} />
                        <Typography variant="caption" sx={{ mr: 1 }}>Short</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>83%</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent Activity and Quick Actions */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Recent Activity
            </Typography>
            
            <List sx={{ width: '100%', p: 0 }}>
              {/* Activity Item 1 */}
              <ListItem 
                sx={{ 
                  px: 2, 
                  py: 1.5, 
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  mb: 1
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <ArrowUpwardIcon sx={{ color: '#00c853' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">
                      Bought AAPL
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      2 hours ago
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    100 shares @ $198.45
                  </Typography>
                </Box>
              </ListItem>
              
              {/* Activity Item 2 */}
              <ListItem 
                sx={{ 
                  px: 2, 
                  py: 1.5, 
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  mb: 1
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(156, 39, 176, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <ArrowDownwardIcon sx={{ color: '#ff3b5f' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">
                      Sold TSLA 220 Call
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Yesterday
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    5 contracts @ $4.25
                  </Typography>
                </Box>
              </ListItem>
              
              {/* Activity Item 3 */}
              <ListItem 
                sx={{ 
                  px: 2, 
                  py: 1.5, 
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  mb: 1
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <CalendarTodayIcon sx={{ color: '#ff9800' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">
                      Added Iron Condor on SPY
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      3 days ago
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    3 spreads, max profit $450
                  </Typography>
                </Box>
              </ListItem>
              
              {/* Activity Item 4 */}
              <ListItem 
                sx={{ 
                  px: 2, 
                  py: 1.5, 
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(0, 200, 83, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <AttachMoneyIcon sx={{ color: '#00c853' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">
                      Deposited funds
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      1 week ago
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    $5,000.00 to trading account
                  </Typography>
                </Box>
              </ListItem>
            </List>
          </Paper>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              height: '100%'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Quick Actions
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<StockIcon />}
                  onClick={() => handleNavigation('/stocks')}
                  sx={{ 
                    py: 1.5,
                    borderColor: 'rgba(33, 150, 243, 0.5)',
                    color: '#2196f3',
                    '&:hover': {
                      borderColor: '#2196f3',
                      backgroundColor: 'rgba(33, 150, 243, 0.08)'
                    }
                  }}
                >
                  Add Stock
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<OptionIcon />}
                  onClick={() => handleNavigation('/options')}
                  sx={{ 
                    py: 1.5,
                    borderColor: 'rgba(156, 39, 176, 0.5)',
                    color: '#9c27b0',
                    '&:hover': {
                      borderColor: '#9c27b0',
                      backgroundColor: 'rgba(156, 39, 176, 0.08)'
                    }
                  }}
                >
                  Add Option
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CashIcon />}
                  onClick={() => handleNavigation('/cash')}
                  sx={{ 
                    py: 1.5,
                    borderColor: 'rgba(0, 200, 83, 0.5)',
                    color: '#00c853',
                    '&:hover': {
                      borderColor: '#00c853',
                      backgroundColor: 'rgba(0, 200, 83, 0.08)'
                    }
                  }}
                >
                  Add Cash
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ViewIcon />}
                  onClick={() => handleNavigation('/journal')}
                  sx={{ 
                    py: 1.5,
                    borderColor: 'rgba(255, 152, 0, 0.5)',
                    color: '#ff9800',
                    '&:hover': {
                      borderColor: '#ff9800',
                      backgroundColor: 'rgba(255, 152, 0, 0.08)'
                    }
                  }}
                >
                  View Journal
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<StatsIcon />}
                  onClick={() => handleNavigation('/analytics')}
                  sx={{ 
                    py: 1.5,
                    borderColor: 'rgba(233, 30, 99, 0.5)',
                    color: '#e91e63',
                    '&:hover': {
                      borderColor: '#e91e63',
                      backgroundColor: 'rgba(233, 30, 99, 0.08)'
                    }
                  }}
                >
                  View Analytics
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
