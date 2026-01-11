
import { useNavigate } from 'react-router-dom';

export const useTimelineNavigation = () => {
  const navigate = useNavigate();

  const navigateToPlayerProfile = (playerId: string, playerName?: string) => {
    // Use the correct route that matches the routing configuration
    navigate(`/player/${playerId}`, {
      state: { playerName }
    });
  };

  const navigateToMatchVideo = (videoId: string, matchTitle?: string) => {
    navigate(`/videos`, {
      state: { 
        highlightVideoId: videoId,
        searchTerm: matchTitle 
      }
    });
  };

  const navigateToTeamProfile = () => {
    navigate('/profile');
  };

  const navigateToTransferPitch = (pitchId: string) => {
    navigate('/explore', {
      state: { highlightPitchId: pitchId }
    });
  };

  return {
    navigateToPlayerProfile,
    navigateToMatchVideo,
    navigateToTeamProfile,
    navigateToTransferPitch
  };
};
