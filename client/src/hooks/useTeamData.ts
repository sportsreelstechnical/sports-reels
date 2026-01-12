import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface TeamData {
  id: string;
  team_name: string;
  sport_type: string;
  country: string;
  league: string;
  logo_url?: string;
  member_association?: string;
  year_founded?: number;
  description?: string;
  titles: string[];
  subscription_tier: string;
  verified: boolean;
}

interface UseTeamDataReturn {
  teamData: TeamData | null;
  loading: boolean;
  error: string | null;
  refetchTeam: () => Promise<void>;
}

export const useTeamData = (): UseTeamDataReturn => {
  const { team, loading: authLoading, refreshUser } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (team) {
      setTeamData({
        id: team.id,
        team_name: team.name,
        sport_type: team.sportType || "football",
        country: team.country || "",
        league: team.leagueBand ? `Band ${team.leagueBand}` : "", // Map leagueBand to string
        logo_url: team.logoUrl || undefined,
        member_association: "",
        year_founded: team.yearFounded || undefined,
        description: team.description || undefined,
        titles: team.titles || [],
        subscription_tier: team.subscriptionTier || "Standard",
        verified: team.verified || false,
      });
    } else {
      setTeamData(null);
    }
    setLoading(false);
  }, [team, authLoading]);

  const refetchTeam = async () => {
    try {
      setLoading(true);
      await refreshUser();
    } catch (err) {
      console.error("Failed to refresh team data", err);
      setError("Failed to refresh team data");
    } finally {
      // Loading state will be updated by useEffect when authLoading changes or completes
    }
  };

  return {
    teamData,
    loading: loading || authLoading,
    error,
    refetchTeam,
  };
};
