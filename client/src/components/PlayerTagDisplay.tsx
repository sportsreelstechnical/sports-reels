import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

interface PlayerTagDisplayProps {
    players: PlayerWithTeam[];
    loading?: boolean;
    error?: string | null;
    size?: 'sm' | 'md' | 'lg';
    showJerseyNumber?: boolean;
    showTeamInfo?: boolean;
    className?: string;
}

const PlayerTagDisplay: React.FC<PlayerTagDisplayProps> = ({
    players,
    loading = false,
    error = null,
    size = 'md',
    showJerseyNumber = true,
    showTeamInfo = false,
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    };

    const badgeSizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    if (loading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="animate-pulse flex items-center gap-2">
                    <div className={`${sizeClasses[size]} bg-gray-700 rounded-full`}></div>
                    <div className="h-4 w-20 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Badge variant="destructive" className={badgeSizeClasses[size]}>
                    Error loading players
                </Badge>
            </div>
        );
    }

    if (!players || players.length === 0) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Badge variant="outline" className={badgeSizeClasses[size]}>
                    No players tagged
                </Badge>
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap items-center ${size === 'sm' ? 'gap-0.5' : 'gap-1'} ${className}`}>
            {players.map((player) => (
                <div key={player.id} className={`flex items-center ${size === 'sm' ? 'gap-0.5' : 'gap-2'}`}>
                    <Avatar className={sizeClasses[size]}>
                        <AvatarImage
                            src={player.headshot_url || player.photo_url || ''}
                            alt={player.full_name || 'Player'}
                        />
                        <AvatarFallback className="bg-bright-pink text-white">
                            {player.full_name?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <span className={`text-white font-medium ${size === 'sm' ? 'text-xs leading-tight' : 'text-sm'}`}>
                                {player.full_name || 'Unknown Player'}
                            </span>
                            {showJerseyNumber && player.jersey_number && (
                                <Badge className={`bg-bright-pink text-white font-bold ${size === 'sm' ? 'text-xs px-0.5 py-0 leading-none' : 'text-xs px-2 py-0.5'}`}>
                                    #{player.jersey_number}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`border-gray-600 text-gray-300 ${size === 'sm' ? 'px-0.5 py-0 leading-none' : 'text-xs'}`}>
                                <span className={`${size === 'sm' ? 'text-xs transform scale-90' : 'text-xs'}`}>
                                    {player.position || 'Unknown'}
                                </span>
                            </Badge>
                        </div>
                        {showTeamInfo && player.teams && (
                            <span className="text-xs text-gray-400">
                                {player.teams.team_name}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PlayerTagDisplay;
