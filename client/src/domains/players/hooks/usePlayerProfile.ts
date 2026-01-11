
import { useState, useCallback } from 'react';

interface UsePlayerProfileReturn {
  selectedPlayerId: string | null;
  selectedPlayerName: string | null;
  isModalOpen: boolean;
  openPlayerProfile: (playerId: string, playerName?: string) => void;
  closePlayerProfile: () => void;
}

export const usePlayerProfile = (): UsePlayerProfileReturn => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openPlayerProfile = useCallback((playerId: string, playerName?: string) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName || null);
    setIsModalOpen(true);
  }, []);

  const closePlayerProfile = useCallback(() => {
    setSelectedPlayerId(null);
    setSelectedPlayerName(null);
    setIsModalOpen(false);
  }, []);

  return {
    selectedPlayerId,
    selectedPlayerName,
    isModalOpen,
    openPlayerProfile,
    closePlayerProfile
  };
};
