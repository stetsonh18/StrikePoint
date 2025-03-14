import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ReactApexChart from 'react-apexcharts';

const Analysis = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = React.useState(0);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Sample price chart data
  const priceChartOptions = {
    chart: {
      type: 'candlestick',
      height: 400,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
        }
      },
      background: 'transparent'
    },
    title: {
      text: 'AAPL Stock Price',
      align: 'left',
      style: {
        color: theme.palette.text.primary
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: theme.palette.text.secondary
        }
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        style: {
          colors: theme.palette.text.secondary
        }
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.1)',
      strokeDashArray: 3
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#00c853',
          downward: '#ff3d00'
        }
      }
    },
    tooltip: {
      theme: 'dark'
    }
  };
  
  const priceChartSeries = [{
    data: [
      { x: new Date(2025, 0, 1), y: [175.2, 177.8, 174.5, 176.3] },
      { x: new Date(2025, 0, 2), y: [176.3, 178.2, 175.8, 177.5] },
      { x: new Date(2025, 0, 3), y: [177.5, 180.1, 176.9, 179.8] },
      { x: new Date(2025, 0, 4), y: [179.8, 181.2, 178.5, 180.7] },
      { x: new Date(2025, 0, 5), y: [180.7, 182.5, 179.9, 181.3] },
      { x: new Date(2025, 0, 6), y: [181.3, 183.1, 180.2, 182.8] },
      { x: new Date(2025, 0, 7), y: [182.8, 185.3, 182.1, 184.9] },
      { x: new Date(2025, 0, 8), y: [184.9, 186.2, 183.7, 185.8] },
      { x: new Date(2025, 0, 9), y: [185.8, 187.3, 184.6, 186.5] },
      { x: new Date(2025, 0, 10), y: [186.5, 188.9, 185.2, 188.1] },
      { x: new Date(2025, 0, 11), y: [188.1, 189.5, 186.8, 187.2] },
      { x: new Date(2025, 0, 12), y: [187.2, 188.7, 185.3, 186.1] },
      { x: new Date(2025, 0, 13), y: [186.1, 187.8, 184.9, 185.7] },
      { x: new Date(2025, 0, 14), y: [185.7, 188.2, 185.1, 187.5] },
      { x: new Date(2025, 0, 15), y: [187.5, 190.3, 187.1, 189.8] },
      { x: new Date(2025, 0, 16), y: [189.8, 192.5, 189.2, 192.1] },
      { x: new Date(2025, 0, 17), y: [192.1, 193.8, 190.7, 193.2] },
      { x: new Date(2025, 0, 18), y: [193.2, 194.7, 192.5, 194.1] },
      { x: new Date(2025, 0, 19), y: [194.1, 196.2, 193.8, 195.7] },
      { x: new Date(2025, 0, 20), y: [195.7, 197.5, 194.9, 196.8] },
      { x: new Date(2025, 0, 21), y: [196.8, 198.5, 195.6, 198.4] },
      { x: new Date(2025, 0, 22), y: [198.4, 200.1, 197.2, 199.5] },
      { x: new Date(2025, 0, 23), y: [199.5, 201.3, 198.7, 200.8] },
      { x: new Date(2025, 0, 24), y: [200.8, 202.5, 199.3, 201.7] },
      { x: new Date(2025, 0, 25), y: [201.7, 203.2, 200.5, 202.3] },
      { x: new Date(2025, 0, 26), y: [202.3, 204.8, 201.9, 204.2] },
      { x: new Date(2025, 0, 27), y: [204.2, 205.7, 203.1, 205.1] },
      { x: new Date(2025, 0, 28), y: [205.1, 206.9, 204.3, 206.2] },
      { x: new Date(2025, 0, 29), y: [206.2, 207.8, 205.4, 207.1] },
      { x: new Date(2025, 0, 30), y: [207.1, 208.5, 206.3, 208.2] }
    ]
  }];
  
  // Volume chart data
  const volumeChartOptions = {
    chart: {
      type: 'bar',
      height: 150,
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        colors: {
          ranges: [{
            from: -100,
            to: 0,
            color: '#ff3d00'
          }, {
            from: 0,
            to: 100,
            color: '#00c853'
          }]
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      type: 'datetime',
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
        formatter: (value) => `${(value / 1000000).toFixed(1)}M`
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.1)',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark'
    }
  };
  
  const volumeChartSeries = [{
    name: 'Volume',
    data: [
      { x: new Date(2025, 0, 1), y: 25000000 },
      { x: new Date(2025, 0, 2), y: 28000000 },
      { x: new Date(2025, 0, 3), y: 32000000 },
      { x: new Date(2025, 0, 4), y: 24000000 },
      { x: new Date(2025, 0, 5), y: 22000000 },
      { x: new Date(2025, 0, 6), y: 19000000 },
      { x: new Date(2025, 0, 7), y: 35000000 },
      { x: new Date(2025, 0, 8), y: 30000000 },
      { x: new Date(2025, 0, 9), y: 27000000 },
      { x: new Date(2025, 0, 10), y: 29000000 },
      { x: new Date(2025, 0, 11), y: 25000000 },
      { x: new Date(2025, 0, 12), y: 28000000 },
      { x: new Date(2025, 0, 13), y: 31000000 },
      { x: new Date(2025, 0, 14), y: 26000000 },
      { x: new Date(2025, 0, 15), y: 38000000 },
      { x: new Date(2025, 0, 16), y: 45000000 },
      { x: new Date(2025, 0, 17), y: 40000000 },
      { x: new Date(2025, 0, 18), y: 35000000 },
      { x: new Date(2025, 0, 19), y: 32000000 },
      { x: new Date(2025, 0, 20), y: 28000000 },
      { x: new Date(2025, 0, 21), y: 30000000 },
      { x: new Date(2025, 0, 22), y: 33000000 },
      { x: new Date(2025, 0, 23), y: 29000000 },
      { x: new Date(2025, 0, 24), y: 27000000 },
      { x: new Date(2025, 0, 25), y: 25000000 },
      { x: new Date(2025, 0, 26), y: 32000000 },
      { x: new Date(2025, 0, 27), y: 30000000 },
      { x: new Date(2025, 0, 28), y: 28000000 },
      { x: new Date(2025, 0, 29), y: 26000000 },
      { x: new Date(2025, 0, 30), y: 31000000 }
    ]
  }];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.common.white }}>
          Analysis
        </Typography>
        <TextField
          placeholder="Search symbol..."
          variant="outlined"
          size="small"
          sx={{ 
            width: 250,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {/* Chart Container */}
      <Paper sx={{ 
        width: '100%', 
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2,
        mb: 4
      }}>
        <Box sx={{ p: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              mb: 3,
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
              },
              '& .MuiTab-root': {
                color: theme.palette.text.secondary,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
              },
            }}
          >
            <Tab label="Price Chart" />
            <Tab label="Technical Indicators" />
            <Tab label="Fundamentals" />
            <Tab label="Options Chain" />
          </Tabs>
          
          <Box sx={{ height: 600 }}>
            {tabValue === 0 && (
              <Box>
                <Box sx={{ height: 400 }}>
                  <ReactApexChart 
                    options={priceChartOptions} 
                    series={priceChartSeries} 
                    type="candlestick" 
                    height={400} 
                  />
                </Box>
                <Box sx={{ height: 150, mt: 2 }}>
                  <ReactApexChart 
                    options={volumeChartOptions} 
                    series={volumeChartSeries} 
                    type="bar" 
                    height={150} 
                  />
                </Box>
              </Box>
            )}
            {tabValue === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Technical Indicators</Typography>
                <Typography variant="body2" color="text.secondary">
                  Technical indicator data will be displayed here.
                </Typography>
              </Box>
            )}
            {tabValue === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Fundamental Analysis</Typography>
                <Typography variant="body2" color="text.secondary">
                  Fundamental analysis data will be displayed here.
                </Typography>
              </Box>
            )}
            {tabValue === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Options Chain</Typography>
                <Typography variant="body2" color="text.secondary">
                  Options chain data will be displayed here.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
      
      {/* Key Statistics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3,
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2,
            height: '100%'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Key Statistics</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Market Cap</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>$3.12T</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">P/E Ratio</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>32.45</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">EPS (TTM)</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>$6.12</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Dividend Yield</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>0.52%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">52 Week High</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>$208.45</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">52 Week Low</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>$155.98</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Avg. Volume</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>32.5M</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Beta</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>1.23</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3,
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2,
            height: '100%'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Analyst Recommendations</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Strong Buy</Typography>
                <Typography variant="body2" color="text.secondary">65%</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                <Box sx={{ width: '65%', height: 8, bgcolor: '#00c853', borderRadius: 4 }} />
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Buy</Typography>
                <Typography variant="body2" color="text.secondary">20%</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                <Box sx={{ width: '20%', height: 8, bgcolor: '#64dd17', borderRadius: 4 }} />
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Hold</Typography>
                <Typography variant="body2" color="text.secondary">10%</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                <Box sx={{ width: '10%', height: 8, bgcolor: '#ffc107', borderRadius: 4 }} />
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Sell</Typography>
                <Typography variant="body2" color="text.secondary">5%</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                <Box sx={{ width: '5%', height: 8, bgcolor: '#ff9800', borderRadius: 4 }} />
              </Box>
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Strong Sell</Typography>
                <Typography variant="body2" color="text.secondary">0%</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                <Box sx={{ width: '0%', height: 8, bgcolor: '#ff3d00', borderRadius: 4 }} />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analysis;
