import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  IconButton, 
  Button, 
  ButtonGroup, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  AccountBalance as AccountBalanceIcon,
  PieChart as PieChartIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import ReactApexChart from 'react-apexcharts';
import { 
  getAccountBalanceHistory, 
  getPerformanceMetrics, 
  getPerformanceOverTime,
  getCashFlowData,
  getPerformanceBySymbol,
  getPerformanceByDate
} from '../services/analyticsService';

const Analytics = () => {
  const theme = useTheme();
  const [timeframe, setTimeframe] = useState('1M');
  
  // Data loading states
  const [accountLoading, setAccountLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [cashFlowLoading, setCashFlowLoading] = useState(true);
  const [symbolLoading, setSymbolLoading] = useState(true);
  
  // Error state
  const [error, setError] = useState(null);
  
  // Data states
  const [accountBalanceHistory, setAccountBalanceHistory] = useState({
    labels: [],
    accountBalance: []
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
    profitFactor: 0,
    averageWin: 0,
    averageLoss: 0
  });
  const [cashFlowData, setCashFlowData] = useState([]);
  const [performanceBySymbol, setPerformanceBySymbol] = useState([]);

  useEffect(() => {
    fetchAnalyticsData(timeframe);
  }, [timeframe]);

  const fetchAnalyticsData = async (period) => {
    setAccountLoading(true);
    setPerformanceLoading(true);
    setCashFlowLoading(true);
    setSymbolLoading(true);
    setError(null);
    
    try {
      // Fetch account balance history
      const accountData = await getAccountBalanceHistory(period);
      if (accountData && Array.isArray(accountData.labels) && Array.isArray(accountData.accountBalance)) {
        setAccountBalanceHistory(accountData);
      } else {
        setAccountBalanceHistory({
          labels: [],
          accountBalance: []
        });
        console.warn("Invalid account balance data format", accountData);
      }
      
      // Fetch performance metrics
      const metrics = await getPerformanceMetrics(period);
      if (metrics && typeof metrics === 'object') {
        setPerformanceMetrics({
          totalPnL: metrics.totalPnL || 0,
          winRate: metrics.winRate || 0,
          totalTrades: metrics.totalTrades || 0,
          profitFactor: metrics.profitFactor || 0,
          averageWin: metrics.averageWin || 0,
          averageLoss: metrics.averageLoss || 0
        });
      } else {
        setPerformanceMetrics({
          totalPnL: 0,
          winRate: 0,
          totalTrades: 0,
          profitFactor: 0,
          averageWin: 0,
          averageLoss: 0
        });
        console.warn("Invalid performance metrics data format", metrics);
      }
      
      // Fetch cash flow data
      const cashFlow = await getCashFlowData(period);
      if (cashFlow && Array.isArray(cashFlow)) {
        setCashFlowData(cashFlow);
      } else {
        setCashFlowData([]);
        console.warn("Invalid cash flow data format", cashFlow);
      }
      
      // Fetch performance by symbol
      const symbolData = await getPerformanceBySymbol(period);
      if (symbolData && Array.isArray(symbolData)) {
        setPerformanceBySymbol(symbolData);
      } else {
        setPerformanceBySymbol([]);
        console.warn("Invalid performance by symbol data format", symbolData);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data. Please try again later.");
    } finally {
      setAccountLoading(false);
      setPerformanceLoading(false);
      setCashFlowLoading(false);
      setSymbolLoading(false);
    }
  };
  
  const handleTimeframeChange = (period) => {
    setTimeframe(period);
  };

  // Account Balance Chart Options
  const accountBalanceOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: true
      },
      background: 'transparent'
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    colors: [theme.palette.primary.main],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: accountBalanceHistory.labels || [],
      labels: {
        style: {
          colors: theme.palette.text.secondary
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        formatter: function(val) {
          return '$' + val.toFixed(0);
        },
        style: {
          colors: theme.palette.text.secondary
        }
      }
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: function(val) {
          return '$' + val.toFixed(2);
        }
      }
    }
  };

  // Generate mock data if needed for development
  const generateMockData = () => {
    const today = new Date();
    const labels = [];
    const accountBalance = [];
    
    // Generate 30 days of data
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      labels.push(date.toISOString().split('T')[0]);
      
      // Generate random balance between 10000 and 15000
      const balance = 10000 + Math.random() * 5000;
      accountBalance.push(balance);
    }
    
    setAccountBalanceHistory({
      labels,
      accountBalance
    });
    
    setPerformanceMetrics({
      totalPnL: 2345.67,
      winRate: 65.4,
      totalTrades: 28,
      profitFactor: 2.1,
      averageWin: 450,
      averageLoss: 215
    });
    
    const mockCashFlow = [];
    for (let i = 0; i < 6; i++) {
      const month = new Date();
      month.setMonth(today.getMonth() - i);
      mockCashFlow.push({
        date: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
        deposits: Math.random() * 2000,
        withdrawals: Math.random() * 1000
      });
    }
    setCashFlowData(mockCashFlow.reverse());
    
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];
    const mockSymbolData = symbols.map(symbol => ({
      symbol,
      pnl: (Math.random() * 2000) - 1000,
      trades: Math.floor(Math.random() * 20) + 1,
      winRate: Math.random() * 100
    }));
    setPerformanceBySymbol(mockSymbolData);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Analytics Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* First Row - Account Balance Chart */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #2196f3, #64b5f6)'
            }
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.common.white }}>
                Account Balance History
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ButtonGroup variant="outlined" size="small">
                  {['1M', '3M', '6M', '1Y', 'ALL'].map((period) => (
                    <Button 
                      key={period} 
                      onClick={() => handleTimeframeChange(period)}
                      sx={{ 
                        color: timeframe === period ? theme.palette.common.white : theme.palette.text.secondary,
                        backgroundColor: timeframe === period ? `${theme.palette.primary.main}20` : 'transparent',
                        borderColor: theme.palette.divider,
                        '&:hover': {
                          backgroundColor: `${theme.palette.primary.main}10`
                        },
                        px: 1.5,
                        fontSize: '0.75rem'
                      }}
                    >
                      {period}
                    </Button>
                  ))}
                </ButtonGroup>
                <IconButton 
                  size="small" 
                  onClick={() => fetchAnalyticsData(timeframe)}
                  sx={{ 
                    color: theme.palette.primary.main,
                    backgroundColor: `${theme.palette.primary.main}10`,
                    '&:hover': {
                      backgroundColor: `${theme.palette.primary.main}20`
                    }
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
                {/* Development only - Generate mock data button */}
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    size="small" 
                    onClick={generateMockData}
                    variant="outlined"
                    sx={{ 
                      ml: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    Generate Mock Data
                  </Button>
                )}
              </Box>
            </Box>
            
            {accountLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : accountBalanceHistory.labels && accountBalanceHistory.labels.length > 0 ? (
              <ReactApexChart 
                options={accountBalanceOptions}
                series={[{
                  name: 'Account Balance',
                  data: accountBalanceHistory.accountBalance || []
                }]}
                type="area"
                height={350}
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350, flexDirection: 'column' }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  No account balance data available for the selected timeframe.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={generateMockData}
                  startIcon={<RefreshIcon />}
                >
                  Generate Sample Data
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Second Row - Performance Metrics */}
      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: theme.palette.success.main
            }
          }}>
            <ShowChartIcon sx={{ fontSize: 40, color: theme.palette.success.main, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
              Total P&L
            </Typography>
            {performanceLoading ? (
              <CircularProgress size={30} color="success" />
            ) : (
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: performanceMetrics.totalPnL >= 0 ? theme.palette.success.main : theme.palette.error.main 
              }}>
                {performanceMetrics.totalPnL >= 0 ? '+' : ''}${performanceMetrics.totalPnL.toFixed(2)}
              </Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: theme.palette.primary.main
            }
          }}>
            <BarChartIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
              Win Rate
            </Typography>
            {performanceLoading ? (
              <CircularProgress size={30} color="primary" />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {performanceMetrics.winRate.toFixed(1)}%
              </Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: theme.palette.info.main
            }
          }}>
            <AccountBalanceIcon sx={{ fontSize: 40, color: theme.palette.info.main, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
              Total Trades
            </Typography>
            {performanceLoading ? (
              <CircularProgress size={30} color="info" />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                {performanceMetrics.totalTrades}
              </Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: theme.palette.secondary.main
            }
          }}>
            <PieChartIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
              Profit Factor
            </Typography>
            {performanceLoading ? (
              <CircularProgress size={30} color="secondary" />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                {performanceMetrics.profitFactor.toFixed(2)}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Third Row - Cash Flow and Performance by Symbol */}
      <Grid container spacing={3} sx={{ mt: 0.5, mb: 3 }}>
        {/* Cash Flow Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #ff9800, #ffb74d)'
            }
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.common.white }}>
                Cash Flow Analysis
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => fetchAnalyticsData(timeframe)}
                sx={{ 
                  color: theme.palette.warning.main,
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 152, 0, 0.2)'
                  }
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
            
            {cashFlowLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <CircularProgress color="warning" />
              </Box>
            ) : cashFlowData && cashFlowData.length > 0 ? (
              <ReactApexChart 
                options={{
                  chart: {
                    type: 'bar',
                    stacked: true,
                    background: 'transparent',
                    toolbar: {
                      show: true
                    }
                  },
                  colors: ['#4caf50', '#f44336'],
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: '55%',
                      borderRadius: 2
                    }
                  },
                  xaxis: {
                    type: 'category',
                    categories: cashFlowData.map(item => item.date || ''),
                    labels: {
                      style: {
                        colors: 'rgba(255, 255, 255, 0.6)'
                      }
                    }
                  },
                  yaxis: {
                    labels: {
                      style: {
                        colors: 'rgba(255, 255, 255, 0.6)'
                      },
                      formatter: function(val) {
                        return '$' + Math.abs(val).toFixed(0);
                      }
                    }
                  },
                  grid: {
                    borderColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  legend: {
                    position: 'top',
                    horizontalAlign: 'right',
                    labels: {
                      colors: 'rgba(255, 255, 255, 0.6)'
                    }
                  },
                  tooltip: {
                    theme: 'dark',
                    y: {
                      formatter: function(val) {
                        return '$' + Math.abs(val).toFixed(2);
                      }
                    }
                  }
                }}
                series={[
                  {
                    name: 'Deposits',
                    data: cashFlowData.map(item => item.deposits || 0)
                  },
                  {
                    name: 'Withdrawals',
                    data: cashFlowData.map(item => -(item.withdrawals || 0))
                  }
                ]}
                type="bar"
                height={350}
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <Typography variant="body1" color="text.secondary">
                  No cash flow data available for the selected timeframe.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Performance by Symbol */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #9c27b0, #ba68c8)'
            }
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.common.white }}>
                Performance by Symbol
              </Typography>
              <IconButton 
                size="small"
                onClick={() => fetchAnalyticsData(timeframe)}
                sx={{ 
                  color: theme.palette.secondary.main,
                  backgroundColor: 'rgba(156, 39, 176, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(156, 39, 176, 0.2)'
                  }
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
            
            {symbolLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <CircularProgress color="secondary" />
              </Box>
            ) : performanceBySymbol && performanceBySymbol.length > 0 ? (
              <TableContainer sx={{ maxHeight: 350, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          backgroundColor: 'rgba(156, 39, 176, 0.1)', 
                          color: theme.palette.common.white,
                          fontWeight: 'bold',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        Symbol
                      </TableCell>
                      <TableCell 
                        align="right" 
                        sx={{ 
                          backgroundColor: 'rgba(156, 39, 176, 0.1)', 
                          color: theme.palette.common.white,
                          fontWeight: 'bold',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        P&L
                      </TableCell>
                      <TableCell 
                        align="right" 
                        sx={{ 
                          backgroundColor: 'rgba(156, 39, 176, 0.1)', 
                          color: theme.palette.common.white,
                          fontWeight: 'bold',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        Trades
                      </TableCell>
                      <TableCell 
                        align="right" 
                        sx={{ 
                          backgroundColor: 'rgba(156, 39, 176, 0.1)', 
                          color: theme.palette.common.white,
                          fontWeight: 'bold',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        Win Rate
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performanceBySymbol.map((row, index) => (
                      <TableRow 
                        key={row.symbol || index}
                        sx={{ 
                          '&:nth-of-type(odd)': { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
                        }}
                      >
                        <TableCell 
                          component="th" 
                          scope="row"
                          sx={{ 
                            color: theme.palette.common.white, 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          {row.symbol || 'Unknown'}
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: (row.pnl || 0) >= 0 ? theme.palette.success.main : theme.palette.error.main,
                            fontWeight: 'bold',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          {(row.pnl || 0) >= 0 ? '+' : ''}${(row.pnl || 0).toFixed(2)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          {row.trades || 0}
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: (row.winRate || 0) >= 50 ? theme.palette.success.main : theme.palette.error.main,
                            fontWeight: 'bold',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          {(row.winRate || 0).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
                <Typography variant="body1" color="text.secondary">
                  No performance data available for the selected timeframe.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;
