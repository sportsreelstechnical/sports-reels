import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface ExpiringPitch {
  id: string;
  expires_at: string;
  asking_price: number;
  currency: string;
  view_count: number;
  message_count: number;
  players: {
    full_name: string;
    position: string;
  };
}

const ExpiringSoonWidget = () => {
  const { profile } = useAuth();
  const [expiringPitches, setExpiringPitches] = useState<ExpiringPitch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchExpiringPitches();
    }
  }, [profile]);

  const fetchExpiringPitches = async () => {
    try {
      setLoading(true);
      
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!teamData) return;

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data, error } = await supabase
        .from('transfer_pitches')
        .select(`
          id,
          expires_at,
          asking_price,
          currency,
          view_count,
          message_count,
          players!transfer_pitches_player_id_fkey(
            full_name,
            position
          )
        `)
        .eq('team_id', teamData.id)
        .eq('status', 'active')
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) throw error;
      setExpiringPitches(data || []);
    } catch (error) {
      console.error('Error fetching expiring pitches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffInDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft <= 1) return 'bg-red-600 text-white animate-pulse';
    if (daysLeft <= 3) return 'bg-orange-600 text-white';
    return 'bg-yellow-600 text-white';
  };

  const handleExtendPitch = async (pitchId: string) => {
    try {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);

      const { error } = await supabase
        .from('transfer_pitches')
        .update({ expires_at: newExpiryDate.toISOString() })
        .eq('id', pitchId);

      if (error) throw error;
      
      fetchExpiringPitches(); // Refresh the list
    } catch (error) {
      console.error('Error extending pitch:', error);
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-3 sm:p-4">
          <div className="animate-pulse">
            <div className="h-4 sm:h-5 bg-gray-700 rounded w-1/2 mb-2 sm:mb-3"></div>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 sm:h-14 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Loading expiring pitches...</p>
        </CardContent>
      </Card>
    );
  }

  if (expiringPitches.length === 0) {
    return (
      <Card className="border-gray-700">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
            Expiring Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 sm:py-8 p-3 sm:p-4">
          <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-green-400" />
          <p className="text-xs sm:text-sm text-gray-400">No pitches expiring in the next 7 days</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500 border-2">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center justify-between text-white text-base sm:text-lg">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
            <span className="truncate">Expiring Soon ({expiringPitches.length})</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={fetchExpiringPitches}
            className="text-gray-400 hover:text-white p-1.5 sm:p-2 flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:p-4">
        {expiringPitches.map((pitch) => {
          const daysLeft = getDaysUntilExpiry(pitch.expires_at);
          return (
            <Card key={pitch.id} className="border-gray-600">
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                        {pitch.players.full_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-black truncate">
                        {pitch.players.position} • {formatCurrency(pitch.asking_price, pitch.currency)}
                      </p>
                    </div>
                    <Badge className={`${getUrgencyColor(daysLeft)} text-[10px] sm:text-xs flex-shrink-0 whitespace-nowrap`}>
                      {daysLeft}d
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-black">
                      <span>{pitch.view_count} views</span>
                      <span>{pitch.message_count} msgs</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleExtendPitch(pitch.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm w-full sm:w-auto"
                    >
                      <span className="hidden sm:inline">Extend 30 Days</span>
                      <span className="sm:hidden">Extend</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ExpiringSoonWidget;
