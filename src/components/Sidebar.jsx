import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  useTheme,
  Collapse
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BarChartIcon from '@mui/icons-material/BarChart';
import ResearchIcon from '@mui/icons-material/Science';
import WatchlistIcon from '@mui/icons-material/Visibility';
import AnalysisIcon from '@mui/icons-material/Assessment';
import TrendingIcon from '@mui/icons-material/TrendingUp';
import AIResearchIcon from '@mui/icons-material/Psychology';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 240;

/**
 * Sidebar component for navigation within the StrikePoint application
 */
const Sidebar = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [researchOpen, setResearchOpen] = useState(false);

  // Check if any research submenu is active
  const isResearchActive = location.pathname.startsWith('/research');
  
  // Auto-expand research menu if a research page is active
  React.useEffect(() => {
    if (isResearchActive && !researchOpen) {
      setResearchOpen(true);
    }
  }, [location.pathname, isResearchActive]);

  const handleResearchClick = () => {
    setResearchOpen(!researchOpen);
  };

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { name: 'Stocks', path: '/stocks', icon: <ShowChartIcon /> },
    { name: 'Options', path: '/options', icon: <CandlestickChartIcon /> },
    { name: 'Cash', path: '/cash', icon: <AccountBalanceWalletIcon /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChartIcon /> },
    { name: 'Journal', path: '/journal', icon: <MenuBookIcon /> },
  ];

  // Research submenu items
  const researchItems = [
    { name: 'Watchlist', path: '/research/watchlist', icon: <WatchlistIcon /> },
    { name: 'Analysis', path: '/research/analysis', icon: <AnalysisIcon /> },
    { name: 'Trending', path: '/research/trending', icon: <TrendingIcon /> },
    { name: 'AI Research', path: '/research/ai', icon: <AIResearchIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: drawerWidth, 
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 0 20px rgba(0,0,0,0.1)',
          pt: 8 // Space for the navbar
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          {navItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  py: 1.2,
                  borderLeft: '3px solid',
                  borderColor: location.pathname === item.path 
                    ? theme.palette.primary.main 
                    : 'transparent',
                  backgroundColor: location.pathname === item.path 
                    ? `${theme.palette.primary.main}10` 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`,
                  },
                  '&.Mui-selected': {
                    backgroundColor: `${theme.palette.primary.main}10`,
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: `${theme.palette.primary.main}15`,
                  },
                  mx: 1,
                  borderRadius: 1,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: location.pathname === item.path 
                      ? theme.palette.primary.main 
                      : theme.palette.text.secondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path 
                        ? theme.palette.common.white 
                        : theme.palette.text.secondary,
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          
          {/* Research Menu with Submenu */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleResearchClick}
              selected={isResearchActive}
              sx={{
                py: 1.2,
                borderLeft: '3px solid',
                borderColor: isResearchActive 
                  ? theme.palette.primary.main 
                  : 'transparent',
                backgroundColor: isResearchActive 
                  ? `${theme.palette.primary.main}10` 
                  : 'transparent',
                '&:hover': {
                  backgroundColor: `${theme.palette.primary.main}08`,
                },
                '&.Mui-selected': {
                  backgroundColor: `${theme.palette.primary.main}10`,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: `${theme.palette.primary.main}15`,
                },
                mx: 1,
                borderRadius: 1,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isResearchActive 
                    ? theme.palette.primary.main 
                    : theme.palette.text.secondary,
                }}
              >
                <ResearchIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Research" 
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: isResearchActive ? 600 : 400,
                    color: isResearchActive 
                      ? theme.palette.common.white 
                      : theme.palette.text.secondary,
                  }
                }}
              />
              {researchOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          {/* Research Submenu */}
          <Collapse in={researchOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {researchItems.map((item) => (
                <ListItem key={item.name} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      py: 1,
                      pl: 4,
                      borderLeft: '3px solid',
                      borderColor: location.pathname === item.path 
                        ? theme.palette.primary.main 
                        : 'transparent',
                      backgroundColor: location.pathname === item.path 
                        ? `${theme.palette.primary.main}10` 
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: `${theme.palette.primary.main}08`,
                      },
                      '&.Mui-selected': {
                        backgroundColor: `${theme.palette.primary.main}10`,
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: `${theme.palette.primary.main}15`,
                      },
                      mx: 1,
                      borderRadius: 1,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: location.pathname === item.path 
                          ? theme.palette.primary.main 
                          : theme.palette.text.secondary,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.name} 
                      sx={{
                        '& .MuiTypography-root': {
                          fontWeight: location.pathname === item.path ? 600 : 400,
                          fontSize: '0.9rem',
                          color: location.pathname === item.path 
                            ? theme.palette.common.white 
                            : theme.palette.text.secondary,
                        }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </List>
        <Divider sx={{ my: 2, mx: 2 }} />
      </Box>
    </Drawer>
  );
};

export default Sidebar;
