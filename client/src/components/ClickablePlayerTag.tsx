
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClickablePlayerTagProps {
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ClickablePlayerTag: React.FC<ClickablePlayerTagProps> = ({
  playerId,
  playerName,
  jerseyNumber,
  className = '',
  size = 'md'
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use the correct route that matches App.tsx routing
    navigate(`/player/${playerId}`);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge
      variant="default"
      className={`bg-bright-pink hover:bg-bright-pink/90 text-white cursor-pointer transition-all hover:scale-105 flex items-center gap-1 ${sizeClasses[size]} ${className}`}
      onClick={handleClick}
    >
      <User className="w-3 h-3" />
      {jerseyNumber && <span>#{jerseyNumber}</span>}
      <span>{playerName}</span>
    </Badge>
  );
};
