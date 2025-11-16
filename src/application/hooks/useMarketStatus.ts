import { useQuery } from '@tanstack/react-query';
import {
  getStockMarketStatus,
  getOptionsMarketStatus,
  getFuturesMarketStatus,
  getCryptoMarketStatus,
  getMarketStatusInfo,
  type MarketStatus,
  type MarketStatusInfo,
} from '@/shared/utils/marketStatus';

export type AssetType = 'stock' | 'option' | 'futures' | 'crypto';

/**
 * Hook to get market status for a specific asset type
 * Updates every minute to reflect current market status
 */
export function useMarketStatus(assetType: AssetType): {
  status: MarketStatus;
  info: MarketStatusInfo;
  isLoading: boolean;
} {
  const { data: status } = useQuery<MarketStatus>({
    queryKey: ['market-status', assetType],
    queryFn: () => {
      switch (assetType) {
        case 'stock':
          return getStockMarketStatus();
        case 'option':
          return getOptionsMarketStatus();
        case 'futures':
          return getFuturesMarketStatus();
        case 'crypto':
          return getCryptoMarketStatus();
        default:
          return 'closed' as MarketStatus;
      }
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const currentStatus = status || 'closed';
  const info = getMarketStatusInfo(currentStatus);

  return {
    status: currentStatus,
    info,
    isLoading: !status,
  };
}

