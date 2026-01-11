
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type DatabasePlayer = Tables<'players'>;

export const usePlayerData = (playerId: string | null) => {
  const [player, setPlayer] = useState<DatabasePlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setPlayer(null);
      return;
    }

    const fetchPlayer = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching player data for ID:', playerId);

        // Use maybeSingle() to handle cases where player might not exist
        const { data, error: fetchError } = await supabase
          .from('players')
          .select(`
            id,
            full_name,
            position,
            age,
            height,
            weight,
            market_value,
            bio,
            citizenship,
            foot,
            photo_url,
            headshot_url,
            portrait_url,
            full_body_url,
            gender,
            date_of_birth,
            jersey_number,
            place_of_birth,
            player_agent,
            current_club,
            joined_date,
            contract_expires,
            fifa_id,
            leagues_participated,
            titles_seasons,
            transfer_history,
            international_duty,
            match_stats,
            ai_analysis,
            teams(
              team_name,
              sport_type,
              country,
              logo_url
            )
          `)
          .eq('id', playerId)
          .maybeSingle();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        }

        if (data) {
          console.log('Player data received:', data);
          
          const transformedPlayer: any = {
            id: data.id,
            full_name: data.full_name,
            sport_type: data.teams.sport_type,
            position: data.position,
            age: data.age,
            nationality: data.citizenship,
            team: data.teams.team_name,
            height: data.height?.toString(),
            weight: data.weight?.toString(),
            preferred_foot: data.foot,
            market_value: data.market_value,
            profile_image: data.headshot_url || data.photo_url || data.portrait_url,
            bio: data.bio,
            achievements: data.titles_seasons || [],
            stats: data.match_stats || {},
            // Additional fields
            gender: data.gender,
            date_of_birth: data.date_of_birth,
            jersey_number: data.jersey_number,
            citizenship: data.citizenship,
            place_of_birth: data.place_of_birth,
            foot: data.foot,
            player_agent: data.player_agent,
            current_club: data.current_club,
            joined_date: data.joined_date,
            contract_expires: data.contract_expires,
            fifa_id: data.fifa_id,
            headshot_url: data.headshot_url,
            portrait_url: data.portrait_url,
            full_body_url: data.full_body_url,
            photo_url: data.photo_url,
            leagues_participated: data.leagues_participated,
            titles_seasons: data.titles_seasons,
            transfer_history: data.transfer_history,
            international_duty: data.international_duty,
            match_stats: data.match_stats,
            ai_analysis: data.ai_analysis,
            teams: data.teams // Preserve teams relation for logo access
          };

          setPlayer(transformedPlayer);
        } else {
          setError('Player not found');
        }
      } catch (err: any) {
        console.error('Error fetching player:', err);
        setError(err.message || 'Failed to fetch player data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  return { player, loading, error };
};
