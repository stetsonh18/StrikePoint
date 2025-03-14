import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import PeopleIcon from '@mui/icons-material/People';
import ReactApexChart from 'react-apexcharts';

const Trending = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = React.useState(0);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Sample trending stocks data
  const trendingStocks = [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', change: 5.23, volume: '45.2M', sentiment: 'Bullish' },
    { symbol: 'TSLA', name: 'Tesla Inc.', change: 3.78, volume: '38.7M', sentiment: 'Bullish' },
    { symbol: 'AAPL', name: 'Apple Inc.', change: 1.45, volume: '32.5M', sentiment: 'Neutral' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', change: 4.12, volume: '28.9M', sentiment: 'Bullish' },
    { symbol: 'META', name: 'Meta Platforms Inc.', change: 2.87, volume: '25.3M', sentiment: 'Bullish' },
  ];
  
  // Sample trending options data
  const trendingOptions = [
    { symbol: 'SPY 450 Call', expiry: 'Mar 15', change: 12.45, volume: '125K', sentiment: 'Bullish' },
    { symbol: 'QQQ 380 Put', expiry: 'Mar 15', change: 8.32, volume: '98K', sentiment: 'Bearish' },
    { symbol: 'AAPL 200 Call', expiry: 'Mar 22', change: 15.67, volume: '87K', sentiment: 'Bullish' },
    { symbol: 'NVDA 950 Call', expiry: 'Mar 22', change: 22.34, volume: '76K', sentiment: 'Bullish' },
    { symbol: 'TSLA 180 Put', expiry: 'Mar 15', change: 9.87, volume: '65K', sentiment: 'Bearish' },
  ];
  
  // Sample trending news
  const trendingNews = [
    { title: 'Fed Signals Potential Rate Cut in June Meeting', source: 'Financial Times', time: '2 hours ago', sentiment: 'Bullish' },
    { title: 'NVIDIA Announces New AI Chip, Stock Surges', source: 'CNBC', time: '4 hours ago', sentiment: 'Bullish' },
    { title: 'Oil Prices Drop Amid Middle East Tensions', source: 'Bloomberg', time: '5 hours ago', sentiment: 'Bearish' },
    { title: 'Tesla Faces Production Challenges in Berlin Factory', source: 'Reuters', time: '8 hours ago', sentiment: 'Bearish' },
    { title: 'Apple's New Product Launch Set for Next Month', source: 'Wall Street Journal', time: '10 hours ago', sentiment: 'Neutral' },
  ];
  
  // Sample trending social mentions
  const trendingSocial = [
    { symbol: 'GME', name: 'GameStop Corp.', mentions: 2345, sentiment: 'Bullish', change: 8.5 },
    { symbol: 'AMC', name: 'AMC Entertainment', mentions: 1876, sentiment: 'Bullish', change: 6.7 },
    { symbol: 'PLTR', name: 'Palantir Technologies', mentions: 1543, sentiment: 'Bullish', change: 4.2 },
    { symbol: 'COIN', name: 'Coinbase Global', mentions: 1287, sentiment: 'Neutral', change: 1.8 },
    { symbol: 'SOFI', name: 'SoFi Technologies', mentions: 1125, sentiment: 'Bullish', change: 3.5 },
  ];
  
  // Heat map chart data
  const heatMapOptions = {
    chart: {
      type: 'heatmap',
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    dataLabels: {
      enabled: false
    },
    colors: ["#00c853"],
    title: {
      text: 'Market Sector Performance',
      style: {
        color: theme.palette.text.primary
      }
    },
    xaxis: {
      categories: ['Technology', 'Healthcare', 'Financials', 'Consumer', 'Energy', 'Industrials', 'Materials', 'Utilities', 'Real Estate', 'Communication'],
      labels: {
        style: {
          colors: theme.palette.text.secondary
        }
      }
    },
    yaxis: {
      categories: ['1D', '1W', '1M', '3M', 'YTD', '1Y'],
      labels: {
        style: {
          colors: theme.palette.text.secondary
        }
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 0,
        colorScale: {
          ranges: [{
            from: -10,
            to: -5,
            name: 'Very Bearish',
            color: '#ff3d00'
          }, {
            from: -5,
            to: -2,
            name: 'Bearish',
            color: '#ff9800'
          }, {
            from: -2,
            to: 0,
            name: 'Slightly Bearish',
            color: '#ffc107'
          }, {
            from: 0,
            to: 2,
            name: 'Slightly Bullish',
            color: '#8bc34a'
          }, {
            from: 2,
            to: 5,
            name: 'Bullish',
            color: '#4caf50'
          }, {
            from: 5,
            to: 10,
            name: 'Very Bullish',
            color: '#00c853'
          }]
        }
      }
    },
    tooltip: {
      theme: 'dark'
    }
  };
  
  const heatMapSeries = [
    {
      name: '1D',
      data: [
        { x: 'Technology', y: 1.2 },
        { x: 'Healthcare', y: -0.5 },
        { x: 'Financials', y: 0.8 },
        { x: 'Consumer', y: 0.3 },
        { x: 'Energy', y: -1.5 },
        { x: 'Industrials', y: 0.6 },
        { x: 'Materials', y: -0.2 },
        { x: 'Utilities', y: -0.7 },
        { x: 'Real Estate', y: 0.4 },
        { x: 'Communication', y: 1.1 }
      ]
    },
    {
      name: '1W',
      data: [
        { x: 'Technology', y: 3.5 },
        { x: 'Healthcare', y: 1.2 },
        { x: 'Financials', y: 2.3 },
        { x: 'Consumer', y: 1.8 },
        { x: 'Energy', y: -2.5 },
        { x: 'Industrials', y: 1.5 },
        { x: 'Materials', y: 0.8 },
        { x: 'Utilities', y: -1.2 },
        { x: 'Real Estate', y: 1.1 },
        { x: 'Communication', y: 2.7 }
      ]
    },
    {
      name: '1M',
      data: [
        { x: 'Technology', y: 6.8 },
        { x: 'Healthcare', y: 2.5 },
        { x: 'Financials', y: 4.2 },
        { x: 'Consumer', y: 3.1 },
        { x: 'Energy', y: -3.8 },
        { x: 'Industrials', y: 2.9 },
        { x: 'Materials', y: 1.5 },
        { x: 'Utilities', y: -2.1 },
        { x: 'Real Estate', y: 2.3 },
        { x: 'Communication', y: 5.2 }
      ]
    },
    {
      name: '3M',
      data: [
        { x: 'Technology', y: 12.5 },
        { x: 'Healthcare', y: 5.8 },
        { x: 'Financials', y: 7.3 },
        { x: 'Consumer', y: 6.2 },
        { x: 'Energy', y: -5.4 },
        { x: 'Industrials', y: 5.1 },
        { x: 'Materials', y: 3.7 },
        { x: 'Utilities', y: -3.5 },
        { x: 'Real Estate', y: 4.8 },
        { x: 'Communication', y: 9.6 }
      ]
    },
    {
      name: 'YTD',
      data: [
        { x: 'Technology', y: 15.2 },
        { x: 'Healthcare', y: 7.5 },
        { x: 'Financials', y: 9.1 },
        { x: 'Consumer', y: 8.3 },
        { x: 'Energy', y: -6.7 },
        { x: 'Industrials', y: 6.8 },
        { x: 'Materials', y: 4.9 },
        { x: 'Utilities', y: -4.2 },
        { x: 'Real Estate', y: 5.7 },
        { x: 'Communication', y: 11.3 }
      ]
    },
    {
      name: '1Y',
      data: [
        { x: 'Technology', y: 28.5 },
        { x: 'Healthcare', y: 12.3 },
        { x: 'Financials', y: 15.7 },
        { x: 'Consumer', y: 14.2 },
        { x: 'Energy', y: -8.9 },
        { x: 'Industrials', y: 11.5 },
        { x: 'Materials', y: 8.7 },
        { x: 'Utilities', y: -6.8 },
        { x: 'Real Estate', y: 9.2 },
        { x: 'Communication', y: 22.6 }
      ]
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        Trending
      </Typography>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
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
          <Tab icon={<ShowChartIcon />} label="Stocks" />
          <Tab icon={<CandlestickChartIcon />} label="Options" />
          <Tab icon={<NewspaperIcon />} label="News" />
          <Tab icon={<PeopleIcon />} label="Social" />
        </Tabs>
      </Box>
      
      {/* Tab Content */}
      <Box sx={{ mb: 4 }}>
        {/* Stocks Tab */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ 
                p: 3,
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
                height: '100%'
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Trending Stocks</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List>
                  {trendingStocks.map((stock, index) => (
                    <React.Fragment key={stock.symbol}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Box sx={{ 
                            width: 30, 
                            height: 30, 
                            borderRadius: '50%', 
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {stock.change >= 0 ? (
                              <TrendingUpIcon sx={{ color: '#00c853', fontSize: '1.2rem' }} />
                            ) : (
                              <TrendingDownIcon sx={{ color: '#ff3d00', fontSize: '1.2rem' }} />
                            )}
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>
                                {stock.symbol}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {stock.name}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: stock.change >= 0 ? '#00c853' : '#ff3d00',
                                  fontWeight: 600,
                                  mr: 2
                                }}
                              >
                                {stock.change >= 0 ? '+' : ''}{stock.change}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                                Vol: {stock.volume}
                              </Typography>
                              <Chip 
                                label={stock.sentiment} 
                                size="small" 
                                sx={{ 
                                  backgroundColor: stock.sentiment === 'Bullish' 
                                    ? 'rgba(0, 200, 83, 0.1)' 
                                    : stock.sentiment === 'Bearish'
                                      ? 'rgba(255, 61, 0, 0.1)'
                                      : 'rgba(255, 193, 7, 0.1)', 
                                  color: stock.sentiment === 'Bullish' 
                                    ? '#00c853' 
                                    : stock.sentiment === 'Bearish'
                                      ? '#ff3d00'
                                      : '#ffc107',
                                  fontWeight: 500,
                                  fontSize: '0.7rem'
                                }} 
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < trendingStocks.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Paper sx={{ 
                p: 3,
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
                height: '100%'
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Market Sector Heat Map</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <ReactApexChart 
                  options={heatMapOptions} 
                  series={heatMapSeries} 
                  type="heatmap" 
                  height={350} 
                />
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Options Tab */}
        {tabValue === 1 && (
          <Paper sx={{ 
            p: 3,
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Trending Options</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {trendingOptions.map((option, index) => (
                <React.Fragment key={option.symbol}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ 
                        width: 30, 
                        height: 30, 
                        borderRadius: '50%', 
                        backgroundColor: 'rgba(156, 39, 176, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {option.change >= 0 ? (
                          <TrendingUpIcon sx={{ color: '#00c853', fontSize: '1.2rem' }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: '#ff3d00', fontSize: '1.2rem' }} />
                        )}
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>
                            {option.symbol}
                          </Typography>
                          <Chip 
                            label={`Exp: ${option.expiry}`} 
                            size="small" 
                            sx={{ 
                              backgroundColor: 'rgba(156, 39, 176, 0.1)', 
                              color: '#9c27b0',
                              fontWeight: 500,
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: option.change >= 0 ? '#00c853' : '#ff3d00',
                              fontWeight: 600,
                              mr: 2
                            }}
                          >
                            {option.change >= 0 ? '+' : ''}{option.change}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            Vol: {option.volume}
                          </Typography>
                          <Chip 
                            label={option.sentiment} 
                            size="small" 
                            sx={{ 
                              backgroundColor: option.sentiment === 'Bullish' 
                                ? 'rgba(0, 200, 83, 0.1)' 
                                : 'rgba(255, 61, 0, 0.1)', 
                              color: option.sentiment === 'Bullish' 
                                ? '#00c853' 
                                : '#ff3d00',
                              fontWeight: 500,
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < trendingOptions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
        
        {/* News Tab */}
        {tabValue === 2 && (
          <Paper sx={{ 
            p: 3,
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Trending News</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {trendingNews.map((news, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ 
                        width: 30, 
                        height: 30, 
                        borderRadius: '50%', 
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <NewspaperIcon sx={{ color: '#ffc107', fontSize: '1.2rem' }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {news.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            {news.source}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            {news.time}
                          </Typography>
                          <Chip 
                            label={news.sentiment} 
                            size="small" 
                            sx={{ 
                              backgroundColor: news.sentiment === 'Bullish' 
                                ? 'rgba(0, 200, 83, 0.1)' 
                                : news.sentiment === 'Bearish'
                                  ? 'rgba(255, 61, 0, 0.1)'
                                  : 'rgba(255, 193, 7, 0.1)', 
                              color: news.sentiment === 'Bullish' 
                                ? '#00c853' 
                                : news.sentiment === 'Bearish'
                                  ? '#ff3d00'
                                  : '#ffc107',
                              fontWeight: 500,
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < trendingNews.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
        
        {/* Social Tab */}
        {tabValue === 3 && (
          <Paper sx={{ 
            p: 3,
            backgroundColor: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Social Media Mentions</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {trendingSocial.map((item, index) => (
                <React.Fragment key={item.symbol}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ 
                        width: 30, 
                        height: 30, 
                        borderRadius: '50%', 
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <PeopleIcon sx={{ color: '#e91e63', fontSize: '1.2rem' }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>
                            {item.symbol}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.name}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            {item.mentions.toLocaleString()} mentions
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: item.change >= 0 ? '#00c853' : '#ff3d00',
                              fontWeight: 600,
                              mr: 2
                            }}
                          >
                            {item.change >= 0 ? '+' : ''}{item.change}%
                          </Typography>
                          <Chip 
                            label={item.sentiment} 
                            size="small" 
                            sx={{ 
                              backgroundColor: item.sentiment === 'Bullish' 
                                ? 'rgba(0, 200, 83, 0.1)' 
                                : item.sentiment === 'Bearish'
                                  ? 'rgba(255, 61, 0, 0.1)'
                                  : 'rgba(255, 193, 7, 0.1)', 
                              color: item.sentiment === 'Bullish' 
                                ? '#00c853' 
                                : item.sentiment === 'Bearish'
                                  ? '#ff3d00'
                                  : '#ffc107',
                              fontWeight: 500,
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < trendingSocial.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Trending;
