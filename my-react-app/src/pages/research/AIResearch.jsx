import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  InputAdornment
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import DownloadIcon from '@mui/icons-material/Download';
import ReactApexChart from 'react-apexcharts';

const AIResearch = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  
  // Sample AI insights
  const aiInsights = [
    {
      title: "NVDA Technical Analysis",
      summary: "Based on technical indicators and recent price action, NVIDIA (NVDA) shows strong bullish momentum with potential for continued upside. The stock has formed a solid base above its 50-day moving average and volume patterns indicate institutional accumulation.",
      sentiment: "Bullish",
      confidence: 85,
      date: "Today",
      tags: ["Technical Analysis", "Momentum", "Institutional Activity"]
    },
    {
      title: "SPY Options Flow Analysis",
      summary: "Recent options flow for SPY shows significant call buying activity for April expiration, suggesting institutional traders are positioning for a potential market rally in the coming weeks. Put/call ratio has declined to 0.75, indicating bullish sentiment.",
      sentiment: "Bullish",
      confidence: 72,
      date: "Yesterday",
      tags: ["Options Flow", "Market Sentiment", "Institutional Activity"]
    },
    {
      title: "AAPL Earnings Forecast",
      summary: "AI analysis of Apple's (AAPL) historical earnings patterns, supply chain data, and consumer sentiment indicators suggests the company may exceed analyst expectations in the upcoming earnings report by approximately 5-7%.",
      sentiment: "Bullish",
      confidence: 68,
      date: "2 days ago",
      tags: ["Earnings", "Fundamental Analysis", "Consumer Sentiment"]
    }
  ];
  
  // Sample prediction chart data
  const predictionChartOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#2196f3', '#e91e63'],
    stroke: {
      curve: 'smooth',
      width: [3, 2],
      dashArray: [0, 5]
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
        formatter: (value) => `$${value.toFixed(2)}`
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
    },
    tooltip: {
      theme: 'dark'
    },
    annotations: {
      xaxis: [{
        x: new Date('2025-03-13').getTime(),
        borderColor: '#00c853',
        label: {
          borderColor: '#00c853',
          style: {
            color: '#fff',
            background: '#00c853'
          },
          text: 'Current'
        }
      }]
    }
  };
  
  const predictionChartSeries = [
    {
      name: 'Historical Price',
      data: [
        [new Date('2025-02-01').getTime(), 180.25],
        [new Date('2025-02-05').getTime(), 182.73],
        [new Date('2025-02-10').getTime(), 185.42],
        [new Date('2025-02-15').getTime(), 183.91],
        [new Date('2025-02-20').getTime(), 187.35],
        [new Date('2025-02-25').getTime(), 190.28],
        [new Date('2025-03-01').getTime(), 192.56],
        [new Date('2025-03-05').getTime(), 195.12],
        [new Date('2025-03-10').getTime(), 197.85],
        [new Date('2025-03-13').getTime(), 198.45]
      ]
    },
    {
      name: 'AI Prediction',
      data: [
        [new Date('2025-03-13').getTime(), 198.45],
        [new Date('2025-03-15').getTime(), 200.12],
        [new Date('2025-03-20').getTime(), 204.35],
        [new Date('2025-03-25').getTime(), 207.89],
        [new Date('2025-03-30').getTime(), 210.45],
        [new Date('2025-04-05').getTime(), 213.27],
        [new Date('2025-04-10').getTime(), 215.68],
        [new Date('2025-04-15').getTime(), 218.92]
      ]
    }
  ];
  
  // Sample sentiment analysis data
  const sentimentChartOptions = {
    chart: {
      type: 'area',
      height: 200,
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#00c853', '#ff3d00'],
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
        formatter: (value) => `${value.toFixed(0)}%`
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
    },
    tooltip: {
      theme: 'dark'
    }
  };
  
  const sentimentChartSeries = [
    {
      name: 'Bullish',
      data: [
        [new Date('2025-02-01').getTime(), 55],
        [new Date('2025-02-05').getTime(), 58],
        [new Date('2025-02-10').getTime(), 62],
        [new Date('2025-02-15').getTime(), 60],
        [new Date('2025-02-20').getTime(), 65],
        [new Date('2025-02-25').getTime(), 68],
        [new Date('2025-03-01').getTime(), 72],
        [new Date('2025-03-05').getTime(), 75],
        [new Date('2025-03-10').getTime(), 78],
        [new Date('2025-03-13').getTime(), 80]
      ]
    },
    {
      name: 'Bearish',
      data: [
        [new Date('2025-02-01').getTime(), 45],
        [new Date('2025-02-05').getTime(), 42],
        [new Date('2025-02-10').getTime(), 38],
        [new Date('2025-02-15').getTime(), 40],
        [new Date('2025-02-20').getTime(), 35],
        [new Date('2025-02-25').getTime(), 32],
        [new Date('2025-03-01').getTime(), 28],
        [new Date('2025-03-05').getTime(), 25],
        [new Date('2025-03-10').getTime(), 22],
        [new Date('2025-03-13').getTime(), 20]
      ]
    }
  ];
  
  const handleSearch = () => {
    if (query.trim() === '') return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setHasResults(true);
    }, 1500);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: theme.palette.common.white }}>
        AI Research
      </Typography>
      
      {/* Search Section */}
      <Paper sx={{ 
        p: 3,
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2,
        mb: 4
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Ask AI for Market Insights
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="e.g., 'Analyze AAPL technical patterns' or 'Predict SPY movement next week'"
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ 
              mr: 2,
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
                  <PsychologyIcon sx={{ color: theme.palette.primary.main }} />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="contained" 
            onClick={handleSearch}
            disabled={isLoading || query.trim() === ''}
            sx={{ 
              py: 1.5, 
              px: 4,
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              }
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Analyze'}
          </Button>
        </Box>
      </Paper>
      
      {/* Results Section */}
      {hasResults && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ 
              p: 3,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              borderRadius: 2,
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AAPL Price Prediction
                </Typography>
                <Box>
                  <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
                    <BookmarkBorderIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
                    <ShareIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Based on technical analysis, fundamental factors, and market sentiment, our AI model predicts Apple (AAPL) will likely continue its upward trend over the next 30 days with a price target of $218.92 (10.3% upside potential).
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Key factors supporting this prediction:
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                    Strong technical indicators with price above both 50-day and 200-day moving averages
                  </Typography>
                  <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                    Positive earnings momentum with expected beat in upcoming quarterly report
                  </Typography>
                  <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                    Increasing institutional ownership (3.2% increase in last 30 days)
                  </Typography>
                  <Typography component="li" variant="body1">
                    Bullish options flow with significant call buying activity
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ height: 350, mb: 3 }}>
                <ReactApexChart 
                  options={predictionChartOptions} 
                  series={predictionChartSeries} 
                  type="line" 
                  height={350} 
                />
              </Box>
              
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Market Sentiment Analysis
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ReactApexChart 
                    options={sentimentChartOptions} 
                    series={sentimentChartSeries} 
                    type="area" 
                    height={200} 
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 3,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              borderRadius: 2,
              height: '100%'
            }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                AI Trading Signals
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Overall Signal</Typography>
                  <Chip 
                    label="Strong Buy" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(0, 200, 83, 0.1)', 
                      color: '#00c853',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }} 
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Confidence Level</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>85%</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">Time Horizon</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>30 Days</Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Key Metrics
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Technical Score</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#00c853' }}>92/100</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Box sx={{ width: '92%', height: 4, bgcolor: '#00c853', borderRadius: 2 }} />
                </Box>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Fundamental Score</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#00c853' }}>85/100</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Box sx={{ width: '85%', height: 4, bgcolor: '#00c853', borderRadius: 2 }} />
                </Box>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Sentiment Score</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#00c853' }}>80/100</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Box sx={{ width: '80%', height: 4, bgcolor: '#00c853', borderRadius: 2 }} />
                </Box>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Options Flow Score</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#00c853' }}>78/100</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Box sx={{ width: '78%', height: 4, bgcolor: '#00c853', borderRadius: 2 }} />
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Suggested Strategy
              </Typography>
              
              <Box sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                  Consider buying AAPL shares or April 16 $205 call options for a potential 10% upside over the next 30 days. Set stop loss at $190 to manage risk.
                </Typography>
              </Box>
              
              <Button 
                fullWidth 
                variant="outlined" 
                sx={{ 
                  borderColor: theme.palette.primary.main, 
                  color: theme.palette.primary.main,
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: 'rgba(33, 150, 243, 0.08)',
                  }
                }}
              >
                View Detailed Report
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Recent AI Insights */}
      <Paper sx={{ 
        p: 3,
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Recent AI Insights
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {aiInsights.map((insight, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ 
                height: '100%', 
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 6px 25px rgba(0,0,0,0.1)',
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {insight.title}
                    </Typography>
                    <Chip 
                      icon={insight.sentiment === 'Bullish' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      label={insight.sentiment} 
                      size="small" 
                      sx={{ 
                        backgroundColor: insight.sentiment === 'Bullish' 
                          ? 'rgba(0, 200, 83, 0.1)' 
                          : 'rgba(255, 61, 0, 0.1)', 
                        color: insight.sentiment === 'Bullish' 
                          ? '#00c853' 
                          : '#ff3d00',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }} 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {insight.summary}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {insight.tags.map((tag, idx) => (
                      <Chip 
                        key={idx}
                        label={tag} 
                        size="small" 
                        sx={{ 
                          backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                          color: theme.palette.primary.main,
                          fontWeight: 500,
                          fontSize: '0.7rem'
                        }} 
                      />
                    ))}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BarChartIcon sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem', mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        {insight.confidence}% confidence
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {insight.date}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default AIResearch;
