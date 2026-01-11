
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VideoPlayer from './VideoPlayer';
import { extractYouTubeVideoId, getYouTubeVideoInfo } from '@/domains/video/services/youtubeService';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    video_url: string;
    opposing_team?: string;
    score?: string;
    tagged_players?: any;
    description?: string;
    match_date?: string;
    team_id?: string;
  } | null;
  onPlayerTagClick?: (playerName: string) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  video,
  onPlayerTagClick
}) => {
  if (!video) return null;

  // Extract player tags from tagged_players
  const extractPlayerTags = (taggedPlayers: any): string[] => {
    if (!taggedPlayers) return [];
    
    try {
      if (Array.isArray(taggedPlayers)) {
        return taggedPlayers.map(player => {
          if (typeof player === 'string') return player;
          if (typeof player === 'object' && player.name) return player.name;
          if (typeof player === 'object' && player.full_name) return player.full_name;
          return 'Unknown Player';
        }).filter(Boolean);
      }
      
      if (typeof taggedPlayers === 'string') {
        try {
          const parsed = JSON.parse(taggedPlayers);
          return Array.isArray(parsed) ? parsed : [taggedPlayers];
        } catch {
          return [taggedPlayers];
        }
      }
    } catch (error) {
      console.error('Error extracting player tags:', error);
    }
    
    return [];
  };

  const metadata = {
    playerTags: extractPlayerTags(video.tagged_players),
    matchDetails: {
      homeTeam: 'Home Team', // Could be extracted from video metadata or team info
      awayTeam: video.opposing_team || 'Away Team',
      league: 'League', // Could be extracted from video metadata
      finalScore: video.score || '0-0'
    },
    duration: 300 // Default duration, could be stored in video metadata
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-6 bg-[#111111] border-[#d4af37]/30">
        <DialogHeader className="mb-6 border-b border-[#d4af37]/20 pb-4">
          <DialogTitle className="font-polysans text-3xl text-white">
            {video.title}
          </DialogTitle>
          {video.description && (
            <p className="text-gray-400 font-poppins mt-2 text-lg">
              {video.description}
            </p>
          )}
        </DialogHeader>
        
        <VideoPlayer
          videoUrl={video.video_url}
          title={video.title}
          videoId={video.id}
          metadata={metadata}
          onPlayerTagClick={onPlayerTagClick}
        />
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
