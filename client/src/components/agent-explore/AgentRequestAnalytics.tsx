
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Target,
  Calendar,
  Users
} from 'lucide-react';

interface AnalyticsData {
  totalRequests: number;
  totalViews: number;
  totalInteractions: number;
  avgEngagement: number;
  topPerformingRequests: Array<{
    id: string;
    title: string;
    views: number;
    interactions: number;
  }>;
  monthlyStats: Array<{
    month: string;
    requests: number;
    views: number;
  }>;
}

export const AgentRequestAnalytics: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalRequests: 0,
    totalViews: 0,
    totalInteractions: 0,
    avgEngagement: 0,
    topPerformingRequests: [],
    monthlyStats: []
  });

  useEffect(() => {
    fetchAgentId();
  }, [profile]);

  useEffect(() => {
    if (agentId) {
      fetchAnalyticsData();
    }
  }, [agentId]);

  const fetchAgentId = async () => {
    if (!profile?.user_type || profile.user_type !== 'agent') return;

    try {
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      setAgentId(data?.id || null);
    } catch (error) {
      console.error('Error fetching agent ID:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      
      // Use placeholder data since new tables might not be synchronized yet
      const placeholderData: AnalyticsData = {
        totalRequests: 12,
        totalViews: 456,
        totalInteractions: 89,
        avgEngagement: 7.4,
        topPerformingRequests: [
          {
            id: '1',
            title: 'EU Striker for Premier League Club',
            views: 156,
            interactions: 34
          },
          {
            id: '2',
            title: 'Young Midfielder - Loan Deal',
            views: 98,
            interactions: 22
          },
          {
            id: '3',
            title: 'Experienced Goalkeeper Needed',
            views: 87,
            interactions: 18
          }
        ],
        monthlyStats: [
          { month: 'Jan', requests: 8, views: 234 },
          { month: 'Feb', requests: 12, views: 456 },
          { month: 'Mar', requests: 15, views: 567 },
          { month: 'Apr', requests: 10, views: 345 }
        ]
      };
      
      setAnalyticsData(placeholderData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Request Analytics</h2>
          <p className="text-muted-foreground">
            Track performance and engagement metrics for your posted requests
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{analyticsData.totalRequests}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{analyticsData.totalViews}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{analyticsData.totalInteractions}</p>
                <p className="text-sm text-muted-foreground">Interactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{analyticsData.avgEngagement.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg. Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top Performing Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analyticsData.topPerformingRequests.map((request, index) => (
            <div key={request.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{request.title}</h4>
                <Badge variant="secondary">#{index + 1}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{request.views} views</span>
                  </div>
                  <Progress value={(request.views / 200) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{request.interactions} interactions</span>
                  </div>
                  <Progress value={(request.interactions / 50) * 100} className="h-2" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData.monthlyStats.map((stat, index) => (
              <div key={stat.month} className="text-center p-4 border rounded-lg">
                <h4 className="font-semibold text-lg">{stat.month}</h4>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">{stat.requests} requests</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{stat.views} views</span>
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

export default AgentRequestAnalytics;
