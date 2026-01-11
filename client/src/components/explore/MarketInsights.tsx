
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Star, 
  MessageSquare,
  Calendar,
  Users,
  Target
} from 'lucide-react';

interface MarketTrend {
  position: string;
  avgPrice: number;
  avgMarketValue: number;
  totalPitches: number;
  priceChange: number;
  demandLevel: 'high' | 'medium' | 'low';
}

interface ActivityLog {
  id: string;
  type: 'pitch_created' | 'request_posted' | 'player_shortlisted' | 'message_sent';
  description: string;
  timestamp: string;
  metadata?: any;
}

interface MarketInsightsProps {
  trends: MarketTrend[];
  recentActivity: ActivityLog[];
  totalActivePitches: number;
  totalActiveRequests: number;
  subscriptionTier?: string;
}

const MarketInsights: React.FC<MarketInsightsProps> = ({
  trends,
  recentActivity,
  totalActivePitches,
  totalActiveRequests,
  subscriptionTier
}) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'activity'>('trends');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getDemandColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'pitch_created': return <Target className="w-4 h-4 text-blue-500" />;
      case 'request_posted': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'player_shortlisted': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'message_sent': return <MessageSquare className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{totalActivePitches}</p>
                <p className="text-sm text-gray-400">Active Pitches</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{totalActiveRequests}</p>
                <p className="text-sm text-gray-400">Agent Requests</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-white">
                  {subscriptionTier === 'basic' ? 'Domestic Only' : 'Global Access'}
                </p>
                <p className="text-sm text-gray-400">Market Access</p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Trends & Activity */}
      <Card className="border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white font-polysans">
              <BarChart3 className="w-5 h-5" />
              Market Intelligence
            </CardTitle>
            <div className="flex bg-gray-800 rounded-lg p-1">
              <Button
                size="sm"
                variant={activeTab === 'trends' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('trends')}
                className={activeTab === 'trends' ? 'bg-rosegold text-black' : 'text-gray-300 hover:text-white'}
              >
                Trends
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'activity' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('activity')}
                className={activeTab === 'activity' ? 'bg-rosegold text-black' : 'text-gray-300 hover:text-white'}
              >
                Activity
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === 'trends' ? (
            <div className="space-y-4">
              {trends.map((trend) => (
                <div
                  key={trend.position}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="font-medium text-white">{trend.position}</p>
                      <p className="text-sm text-gray-400">{trend.totalPitches} active pitches</p>
                    </div>
                    <Badge variant="outline" className={getDemandColor(trend.demandLevel)}>
                      {trend.demandLevel} demand
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{formatCurrency(trend.avgPrice)}</p>
                      <p className="text-xs text-gray-500">avg asking</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{formatCurrency(trend.avgMarketValue)}</p>
                      <p className="text-xs text-gray-500">market value</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {trend.priceChange >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm ${trend.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {Math.abs(trend.priceChange)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.description}</p>
                    <p className="text-gray-400 text-xs">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                  <p className="text-gray-400">No recent activity</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Prompt for Basic Users */}
      {subscriptionTier === 'basic' && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-yellow-500" />
              <div className="flex-1">
                <p className="text-white font-medium">Unlock Global Market Access</p>
                <p className="text-gray-400 text-sm">
                  Upgrade to Premium to view international transfers and access advanced market insights.
                </p>
              </div>
              <Button className="bg-yellow-500 text-black hover:bg-yellow-600">
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketInsights;
