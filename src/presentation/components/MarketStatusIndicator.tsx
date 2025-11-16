import React from 'react';
import { Clock } from 'lucide-react';
import { useMarketStatus, type AssetType } from '@/application/hooks/useMarketStatus';

interface MarketStatusIndicatorProps {
  assetType: AssetType;
  className?: string;
}

export const MarketStatusIndicator: React.FC<MarketStatusIndicatorProps> = ({
  assetType,
  className = '',
}) => {
  const { info, isLoading } = useMarketStatus(assetType);

  if (isLoading) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${info.bgColor} ${info.borderColor} ${info.color} ${className}`}
    >
      <Clock size={14} className={info.color} />
      <span className="text-sm font-medium">{info.label}</span>
    </div>
  );
};

