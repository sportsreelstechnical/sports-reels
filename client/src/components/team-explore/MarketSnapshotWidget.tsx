
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Clock, AlertTriangle } from 'lucide-react';
import { useMarketSnapshot } from '@/hooks/useMarketSnapshot';

const MarketSnapshotWidget = () => {
  const { snapshot, loading } = useMarketSnapshot();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-5 sm:h-6 bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="h-14 sm:h-16 bg-gray-700 rounded"></div>
              <div className="h-14 sm:h-16 bg-gray-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-rosegold flex-shrink-0" />
          Market Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="text-center p-1.5 sm:p-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold text-rosegold break-words">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(snapshot.avgAskingPrice)}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Avg Asking Price</div>
          </div>
          <div className="text-center p-1.5 sm:p-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold text-blue-400">
              {snapshot.activePitches}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Active Pitches</div>
          </div>
          <div className="text-center p-1.5 sm:p-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold text-yellow-400">
              {snapshot.expiringPitches}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Expiring Soon</div>
          </div>
          <div className="text-center p-1.5 sm:p-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold text-red-400">
              {snapshot.expiredWithoutInterest}%
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Expired w/o Interest</div>
          </div>
        </div>

        {/* Trending Positions */}
        <div className="space-y-1.5 sm:space-y-2">
          <h4 className="font-semibold text-white flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
            <span className="truncate">Top 5 Most Pitched</span>
          </h4>
          <div className="space-y-1 sm:space-y-1.5">
            {snapshot.trendingPositions.slice(0, 5).map((position, index) => (
              <div key={position.position} className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                  <span className="text-xs sm:text-sm text-gray-300 w-3 flex-shrink-0">#{index + 1}</span>
                  <span className="text-xs sm:text-sm text-white truncate">{position.position}</span>
                  {position.trend === 'up' && <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400 flex-shrink-0" />}
                  {position.trend === 'down' && <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400 flex-shrink-0" />}
                </div>
                <Badge variant="outline" className="text-gray-400 border-gray-600 text-[10px] sm:text-xs flex-shrink-0 px-1.5">
                  {position.count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Most Requested Positions */}
        {snapshot.topRequestedPositions.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
              <span className="truncate">Most Requested</span>
            </h4>
            <div className="space-y-1 sm:space-y-1.5">
              {snapshot.topRequestedPositions.slice(0, 5).map((position, index) => (
                <div key={position.position} className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                    <span className="text-xs sm:text-sm text-gray-300 w-3 flex-shrink-0">#{index + 1}</span>
                    <span className="text-xs sm:text-sm text-white truncate">{position.position}</span>
                  </div>
                  <Badge variant="outline" className="text-purple-400 border-purple-400 text-[10px] sm:text-xs flex-shrink-0 px-1.5">
                    {position.requestCount}
                  </Badge>
                </div>
              ))}
            </div>
            {snapshot.topRequestedPositions.length > 0 && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2 mt-1.5">
                <div className="flex items-start gap-1.5 text-purple-400 text-[10px] sm:text-xs leading-tight">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>High demand for {snapshot.topRequestedPositions[0]?.position}s</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Supply/Demand Insights */}
        <div className="bg-gray-800/50 rounded p-2 space-y-1">
          <h4 className="font-semibold text-white text-xs sm:text-sm">Market Insights</h4>
          <div className="text-[10px] sm:text-xs text-gray-400 space-y-0.5 leading-tight">
            <div>• {snapshot.activePitches} active pitches</div>
            <div>• {snapshot.expiringPitches} expiring soon</div>
            <div>• {snapshot.expiredWithoutInterest}% expire w/o interest</div>
            {snapshot.avgAskingPrice > snapshot.avgMarketValue && (
              <div className="text-yellow-400">
                • Prices {Math.round(((snapshot.avgAskingPrice - snapshot.avgMarketValue) / snapshot.avgMarketValue) * 100)}% above market
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketSnapshotWidget;
