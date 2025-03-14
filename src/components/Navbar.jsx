import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  InputBase,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import { useLocation, Link } from 'react-router-dom';

// Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/**
 * Professional Navbar component for the StrikePoint application
 * Provides navigation, search, notifications, and account management
 */
const Navbar = () => {
  const theme = useTheme();
  const location = useLocation();
  
  // State for menu controls
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  
  // Handle menu openings
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };
  
  // Handle menu closings
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };
  
  // Mock notifications data
  const notifications = [
    { id: 1, message: 'AAPL position closed with +2.3%', time: '2 min ago', read: false },
    { id: 2, message: 'Market opens in 15 minutes', time: '15 min ago', read: false },
    { id: 3, message: 'New market analysis available', time: '1 hour ago', read: true },
  ];
  
  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    
    // Handle research submenu pages
    if (path.startsWith('/research/')) {
      const subPath = path.replace('/research/', '');
      if (subPath === 'watchlist') return 'Watchlist';
      if (subPath === 'analysis') return 'Analysis';
      if (subPath === 'trending') return 'Trending';
      if (subPath === 'ai') return 'AI Research';
    }
    
    // Handle regular pages
    return path.charAt(1).toUpperCase() + path.slice(2);
  };
  
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', height: 64 }}>
        {/* Logo and Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="h5" 
            component={Link} 
            to="/"
            sx={{ 
              fontWeight: 700, 
              letterSpacing: '-0.5px',
              mr: 2,
              textDecoration: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <BarChartIcon sx={{ mr: 1, fontSize: 28 }} />
            StrikePoint
          </Typography>
          
          {/* Current page title */}
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 500,
              color: alpha(theme.palette.common.white, 0.7),
              display: { xs: 'none', sm: 'block' }
            }}
          >
            {getPageTitle()}
          </Typography>
        </Box>
        
        {/* Center section with search */}
        <Box 
          sx={{ 
            position: 'relative',
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.common.white, 0.08),
            '&:hover': {
              backgroundColor: alpha(theme.palette.common.white, 0.12),
            },
            width: { xs: '40%', sm: '30%', md: '25%' },
            transition: 'all 0.2s ease',
            display: { xs: 'none', md: 'block' }
          }}
        >
          <Box sx={{ position: 'absolute', height: '100%', display: 'flex', alignItems: 'center', pl: 2 }}>
            <SearchIcon sx={{ color: alpha(theme.palette.common.white, 0.6) }} />
          </Box>
          <InputBase
            placeholder="Search…"
            sx={{
              color: 'inherit',
              width: '100%',
              '& .MuiInputBase-input': {
                padding: theme.spacing(1, 1, 1, 0),
                paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                width: '100%',
              },
            }}
          />
        </Box>
        
        {/* Right section with actions */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Market Status Button */}
          <Button
            variant="text"
            startIcon={<TrendingUpIcon />}
            sx={{
              color: theme.palette.success.main,
              mr: 1,
              display: { xs: 'none', md: 'flex' },
              borderRadius: 1.5,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              '&:hover': {
                backgroundColor: alpha(theme.palette.success.main, 0.2),
              },
              px: 1.5
            }}
          >
            Market Open
          </Button>
          
          {/* Help Button */}
          <Tooltip title="Help & Resources">
            <IconButton 
              color="inherit" 
              sx={{ 
                mr: 1,
                display: { xs: 'none', sm: 'flex' }
              }}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit" 
              sx={{ mr: 1 }}
              onClick={handleOpenNotificationsMenu}
            >
              <Badge badgeContent={2} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            id="notifications-menu"
            anchorEl={anchorElNotifications}
            open={Boolean(anchorElNotifications)}
            onClose={handleCloseNotificationsMenu}
            PaperProps={{
              elevation: 3,
              sx: {
                width: 320,
                maxHeight: 400,
                overflow: 'auto',
                mt: 1.5,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  borderLeft: '3px solid transparent',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Typography variant="subtitle1" sx={{ px: 2, py: 1.5, fontWeight: 600 }}>
              Notifications
            </Typography>
            <Divider />
            {notifications.map((notification) => (
              <MenuItem 
                key={notification.id} 
                onClick={handleCloseNotificationsMenu}
                sx={{
                  borderLeftColor: notification.read ? 'transparent' : theme.palette.primary.main,
                  backgroundColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notification.time}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
              <Button size="small" sx={{ width: '100%' }}>
                View All Notifications
              </Button>
            </Box>
          </Menu>
          
          {/* User Account */}
          <Tooltip title="Account settings">
            <IconButton onClick={handleOpenUserMenu}>
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: theme.palette.primary.main,
                  border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(theme.palette.common.white, 0.4),
                  }
                }}
              >
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            id="user-menu"
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              elevation: 3,
              sx: {
                width: 220,
                mt: 1.5,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                John Trader
              </Typography>
              <Typography variant="caption" color="text.secondary">
                john.trader@example.com
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </MenuItem>
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </MenuItem>
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <DarkModeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Dark Mode" />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
