import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import TeamWallet from '@/components/wallet/TeamWallet';
import { supabase } from '@/integrations/supabase/client';

const TeamWalletPage: React.FC = () => {
  const { profile } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated or not a team
  if (!profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.user_type !== 'team') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const fetchOrCreateTeam = async () => {
      if (!profile?.id) {
        console.log('No profile ID available');
        setLoading(false);
        return;
      }

      console.log('Fetching team for profile ID:', profile.id);
      console.log('Profile user_type:', profile.user_type);

      try {
        // First, try to fetch existing team
        const { data: teamData, error } = await supabase
          .from('teams')
          .select('id, team_name')
          .eq('profile_id', profile.id)
          .single();

        if (error) {
          console.error('Error fetching team:', error);
          console.log('Error code:', error.code);

          // If team doesn't exist (PGRST116 is "not found" error), create one
          if (error.code === 'PGRST116') {
            console.log('Team not found, creating default team...');

            const { data: newTeam, error: createError } = await supabase
              .from('teams')
              .insert({
                profile_id: profile.id,
                team_name: profile.full_name || 'My Team',
                country: profile.country || 'United States',
                sport_type: 'football' // Default sport type
              })
              .select('id, team_name')
              .single();

            if (createError) {
              console.error('Error creating team:', createError);
            } else {
              console.log('Team created successfully:', newTeam);
              setTeamId(newTeam.id);
            }
          }
        } else {
          console.log('Team data found:', teamData);
          setTeamId(teamData.id);
        }
      } catch (error) {
        console.error('Exception in fetchOrCreateTeam:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateTeam();
  }, [profile]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background px-4 py-6 sm:px-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  if (!teamId) {
    return (
      <Layout>
        <div className="min-h-screen bg-background px-4 py-6 sm:px-6 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto space-y-4 bg-[#111111] border border-gray-800 rounded-2xl p-6 sm:p-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Team Profile Not Found</h2>
              <p className="text-sm sm:text-base text-gray-400">It looks like your team profile hasn't been set up yet. You need to complete your team profile to access the wallet.</p>
            </div>
            <button
              onClick={() => window.location.href = '/profile'}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              Complete Team Profile
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background px-1 py-6 sm:px-3">
        <TeamWallet teamId={teamId} />
      </div>
    </Layout>
  );
};

export default TeamWalletPage;
