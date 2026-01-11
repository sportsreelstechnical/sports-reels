
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Globe,
  Users,
  Target,
  BarChart3
} from 'lucide-react';

export const AgentMarketInsights: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({
    avgBudget: 0,
    topPositions: [] as Array<{ position: string, count: number }>,
    regions: [] as Array<{ country: string, count: number }>,
    trends: [] as Array<{ category: string, change: number }>
  });

  useEffect(() => {
    fetchMarketData();
  }, [profile]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);

      // Use placeholder data since new tables might not be synchronized yet
      setMarketData({
        avgBudget: 2500000,
        topPositions: [
          { position: 'Midfielder', count: 45 },
          { position: 'Forward', count: 38 },
          { position: 'Defender', count: 32 },
          { position: 'Goalkeeper', count: 15 }
        ],
        regions: [
          { country: 'Germany', count: 28 },
          { country: 'England', count: 25 },
          { country: 'Spain', count: 22 },
          { country: 'France', count: 18 },
          { country: 'Italy', count: 15 }
        ],
        trends: [
          { category: 'Youth Players', change: 12.5 },
          { category: 'Loan Deals', change: -3.2 },
          { category: 'Permanent Transfers', change: 8.7 },
          { category: 'EU Passport Required', change: 15.3 }
        ]
      });
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
        <p className="text-xs text-gray-400 text-center col-span-full mt-2">Loading market insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Market Insights</h2>
          <p className="text-muted-foreground text-sm">
            Current market trends and analytics for agent requests
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        <Card className='border-0'>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl lg:text-2xl font-bold text-foreground truncate">
                  ${(marketData.avgBudget / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">Avg. Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-0'>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl lg:text-2xl font-bold text-foreground">130</p>
                <p className="text-xs text-muted-foreground">Active Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-0'>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl lg:text-2xl font-bold text-foreground">45</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-0'>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl lg:text-2xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Most Requested Positions */}
        <Card className='border-0'>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Most Requested Positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 lg:p-6">
            {marketData.topPositions.map((item, index) => (
              <div key={item.position} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.position}</span>
                  <span className="text-sm text-muted-foreground">{item.count} requests</span>
                </div>
                <Progress value={(item.count / 45) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Regional Activity */}
        <Card className='border-0'>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Regional Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 lg:p-6">
            {marketData.regions.map((item, index) => (
              <div key={item.country} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.country}</span>
                  <span className="text-sm text-muted-foreground">{item.count} requests</span>
                </div>
                <Progress value={(item.count / 28) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Market Trends */}
      <Card className='border-0'>
        <CardHeader className="p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <BarChart3 className="w-5 h-5" />
            Market Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {marketData.trends.map((trend, index) => (
              <div key={trend.category} className="flex items-center border-0 justify-between p-3 lg:p-4 bg-[#111111] rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{trend.category}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {trend.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-bold ${trend.change > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                      {trend.change > 0 ? '+' : ''}{trend.change}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentMarketInsights;
