
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ArrowUpDown, 
  Users, 
  Megaphone, 
  Trophy, 
  Activity 
} from 'lucide-react';

export type EventType = 'match' | 'transfer' | 'player' | 'team' | 'achievement';

export const EventIcon = ({ type }: { type: EventType }) => {
  const iconMap = {
    match: <Zap className="w-5 h-5 text-green-500" />,
    transfer: <ArrowUpDown className="w-5 h-5 text-blue-500" />,
    player: <Users className="w-5 h-5 text-purple-500" />,
    team: <Megaphone className="w-5 h-5 text-orange-500" />,
    achievement: <Trophy className="w-5 h-5 text-yellow-500" />
  };
  
  return iconMap[type] || <Activity className="w-5 h-5 text-gray-500" />;
};

export const EventBadge = ({ type }: { type: EventType }) => {
  const badgeMap = {
    match: { label: 'Match', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
    transfer: { label: 'Transfer', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    player: { label: 'Player', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    team: { label: 'Team', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    achievement: { label: 'Achievement', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
  };
  
  const badge = badgeMap[type] || { label: 'Event', className: 'bg-gray-500/10 text-gray-400' };
  
  return (
    <Badge variant="outline" className={badge.className}>
      {badge.label}
    </Badge>
  );
};
