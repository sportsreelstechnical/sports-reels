import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define the player type based on the database structure
interface DatabasePlayer {
    id: string;
    full_name: string | null;
    position: string | null;
    age: number | null;
    height: number | null;
    weight: number | null;
    market_value: number | null;
    bio: string | null;
    citizenship: string | null;
    foot: string | null;
    photo_url: string | null;
    headshot_url: string | null;
    portrait_url: string | null;
    full_body_url: string | null;
    gender: string | null;
    date_of_birth: string | null;
    jersey_number: string | null;
    place_of_birth: string | null;
    player_agent: string | null;
    current_club: string | null;
    joined_date: string | null;
    contract_expires: string | null;
    fifa_id: string | null;
    leagues_participated: any;
    titles_seasons: any;
    transfer_history: any;
    international_duty: any;
    match_stats: any;
    ai_analysis: any;
}

interface PlayerWithTeam extends DatabasePlayer {
    teams: {
        team_name: string;
        sport_type: string;
        country: string;
        logo_url?: string;
    } | null;
}

export const usePlayersData = (playerIds: string[]) => {
    const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (playerIds.length === 0) {
            setPlayers([]);
            return;
        }

        const fetchPlayers = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('Fetching players data for IDs:', playerIds);

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
                    .in('id', playerIds);

                if (fetchError) {
                    console.error('Fetch error:', fetchError);
                    throw fetchError;
                }

                if (data) {
                    console.log('Players data received:', data);
                    // Transform the data to match our interface
                    const transformedPlayers = data.map((player: any) => ({
                        ...player,
                        teams: player.teams?.[0] || null // Handle array case and make it single object
                    })) as unknown as PlayerWithTeam[];
                    setPlayers(transformedPlayers);
                } else {
                    setPlayers([]);
                }
            } catch (err: any) {
                console.error('Error fetching players:', err);
                setError(err.message || 'Failed to fetch players');
                setPlayers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, [playerIds.join(',')]); // Use join to create a dependency string

    return { players, loading, error };
};

export default usePlayersData;
