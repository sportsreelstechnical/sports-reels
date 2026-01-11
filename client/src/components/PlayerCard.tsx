
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, User, Trash2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type DatabasePlayer = Database['public']['Tables']['players']['Row'] & {
  headshot_url?: string | null;
  jersey_number?: number | null;
  height?: number | null;
  foot?: string | null;
  status?: string | null;
};

interface PlayerCardProps {
  player: DatabasePlayer;
  onEdit: (player: DatabasePlayer) => void;
  onView: (player: DatabasePlayer) => void;
  onDelete?: (player: DatabasePlayer) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onEdit, onView, onDelete }) => {
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Card className="border-0 bg-[#111111]">
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0">
              {player.headshot_url || player.photo_url ? (
                <img
                  src={player.headshot_url || player.photo_url || ''}
                  alt={player.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-rosegold" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <h3 className="font-polysans font-semibold text-white truncate text-sm sm:text-base">
                  {player.full_name}
                </h3>
                {player.status === 'transferred' && (
                  <Badge className="bg-red-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 flex-shrink-0 border-0">
                    TRANSFERRED
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-white/60 font-poppins truncate">{player.position}</p>
              {player.jersey_number && (
                <Badge className="bg-rosegold/20 text-rosegold border-0 mt-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
                  #{player.jersey_number}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm bg-[#1a1a1a] rounded-lg p-2 sm:p-3">
          <div className="flex justify-between items-center">
            <span className="text-white/60">Age:</span>
            <span className="text-white font-medium">
              {player.date_of_birth ? calculateAge(player.date_of_birth) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60">Nationality:</span>
            <span className="text-white font-medium truncate ml-2">{player.citizenship}</span>
          </div>
          {player.height && (
            <div className="flex justify-between items-center">
              <span className="text-white/60">Height:</span>
              <span className="text-white font-medium">{player.height}cm</span>
            </div>
          )}
          {player.foot && (
            <div className="flex justify-between items-center">
              <span className="text-white/60">Foot:</span>
              <span className="text-white font-medium capitalize">{player.foot}</span>
            </div>
          )}
          {player.market_value && (
            <div className="flex justify-between items-center pt-1.5">
              <span className="text-white/60">Value:</span>
              <span className="text-bright-pink font-bold text-sm sm:text-base">
                ${player.market_value.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          <Button
            onClick={() => onView(player)}
            size="sm"
            className="flex-1 bg-rosegold text-white font-poppins text-xs sm:text-sm h-9 sm:h-10 border-0"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">View Details</span>
            <span className="sm:hidden">View</span>
          </Button>
          <Button
            onClick={() => onEdit(player)}
            size="sm"
            className="bg-[#1a1a1a] text-white/60 border-0 h-9 sm:h-10 px-2 sm:px-3"
          >
            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          {onDelete && (
            <Button
              onClick={() => onDelete(player)}
              size="sm"
              className="bg-red-600/20 text-red-400 border-0 h-9 sm:h-10 px-2 sm:px-3"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerCard;
