
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  BarChart3, 
  Users, 
  Star,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MarketSnapshot {
  avgAskingPrice: number;
  avgMarketValue: number;
  activePitches: number;
  expiringPitches: number;
  trendingPositions: Array<{
    position: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface ExploreOverviewProps {
  marketSnapshot: MarketSnapshot;
  onViewActivePitches: () => void;
  onViewTrending: (position: string) => void;
}

const ExploreOverview: React.FC<ExploreOverviewProps> = ({
  marketSnapshot,
  onViewActivePitches,
  onViewTrending
}) => {
  const { profile } = useAuth();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default: return <span className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-700 hover:border-rosegold/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{marketSnapshot.expiringPitches}</p>
                <p className="text-xs text-gray-400">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700 hover:border-rosegold/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{marketSnapshot.activePitches}</p>
                <p className="text-xs text-gray-400">Active Pitches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700 hover:border-rosegold/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{formatCurrency(marketSnapshot.avgAskingPrice)}</p>
                <p className="text-xs text-gray-400">Avg Asking Price</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700 hover:border-rosegold/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{formatCurrency(marketSnapshot.avgMarketValue)}</p>
                <p className="text-xs text-gray-400">Avg Market Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trending Positions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white font-polysans">
              <TrendingUp className="w-5 h-5" />
              Trending Player Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketSnapshot.trendingPositions.map((pos, index) => (
                <div
                  key={pos.position}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => onViewTrending(pos.position)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-rosegold border-rosegold">
                      #{index + 1}
                    </Badge>
                    <span className="text-white font-medium">{pos.position}</span>
                    {getTrendIcon(pos.trend)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">{pos.count} requests</span>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white font-polysans">
              <Clock className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={onViewActivePitches}
              className="w-full bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
              variant="outline"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              View Expiring Pitches ({marketSnapshot.expiringPitches})
            </Button>
            
            {profile?.user_type === 'agent' && (
              <Button
                className="w-full bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                variant="outline"
              >
                <Users className="w-4 h-4 mr-2" />
                My Active Requests
              </Button>
            )}
            
            <Button
              className="w-full bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
              variant="outline"
            >
              <Star className="w-4 h-4 mr-2" />
              View Shortlisted Players
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExploreOverview;
