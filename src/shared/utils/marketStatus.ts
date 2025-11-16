/**
 * Market Status Utilities
 * Determines market status for different asset types based on current time
 */

export type MarketStatus = 'open' | 'closed' | 'pre-market' | 'after-hours' | 'overnight' | '24/7';

export interface MarketStatusInfo {
  status: MarketStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Get US stock market status based on current time
 * Market hours: 9:30 AM - 4:00 PM ET (Monday-Friday)
 * Pre-market: 4:00 AM - 9:30 AM ET (Monday-Friday)
 * After hours: 4:00 PM - 8:00 PM ET (Monday-Friday)
 */
export function getStockMarketStatus(): MarketStatus {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) {
    return 'closed';
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (timeInMinutes >= 4 * 60 && timeInMinutes < 9 * 60 + 30) {
    return 'pre-market';
  }

  // Regular trading hours: 9:30 AM - 4:00 PM ET
  if (timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 16 * 60) {
    return 'open';
  }

  // After hours: 4:00 PM - 8:00 PM ET
  if (timeInMinutes >= 16 * 60 && timeInMinutes < 20 * 60) {
    return 'after-hours';
  }

  // Overnight: 8:00 PM - 4:00 AM ET
  return 'overnight';
}

/**
 * Get options market status (same as stocks)
 */
export function getOptionsMarketStatus(): MarketStatus {
  return getStockMarketStatus();
}

/**
 * Get futures market status
 * Futures markets typically trade nearly 24/7 with brief maintenance windows
 * For simplicity, we'll show extended hours status
 */
export function getFuturesMarketStatus(): MarketStatus {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  const day = etTime.getDay();
  
  // Weekend - futures may still trade but with reduced hours
  if (day === 0 || day === 6) {
    return 'overnight';
  }

  // Futures trade nearly 24/7, so we'll show as "open" during regular hours
  // and "overnight" during extended hours
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Regular trading hours: 9:30 AM - 4:00 PM ET
  if (timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 16 * 60) {
    return 'open';
  }

  // Extended hours
  return 'overnight';
}

/**
 * Get crypto market status (always open)
 */
export function getCryptoMarketStatus(): MarketStatus {
  return '24/7';
}

/**
 * Get market status info with styling
 */
export function getMarketStatusInfo(status: MarketStatus): MarketStatusInfo {
  switch (status) {
    case 'open':
      return {
        status: 'open',
        label: 'Market Open',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      };
    case 'closed':
      return {
        status: 'closed',
        label: 'Market Closed',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/30',
      };
    case 'pre-market':
      return {
        status: 'pre-market',
        label: 'Pre-Market',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
      };
    case 'after-hours':
      return {
        status: 'after-hours',
        label: 'After Hours',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    case 'overnight':
      return {
        status: 'overnight',
        label: 'Extended Hours',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
      };
    case '24/7':
      return {
        status: '24/7',
        label: '24/7 Trading',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      };
    default:
      return {
        status: 'closed',
        label: 'Unknown',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/30',
      };
  }
}

