
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TransferRestrictions {
  canCreatePitch: boolean;
  canViewInternational: boolean;
  canMessagePlayers: boolean;
  hasVideoRequirement: boolean;
  pitchesUsedThisMonth: number;
  maxPitchesPerMonth: number;
  subscriptionTier: string;
  memberAssociation: string;
}

export const useTransferRestrictions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [restrictions, setRestrictions] = useState<TransferRestrictions>({
    canCreatePitch: false,
    canViewInternational: false,
    canMessagePlayers: false,
    hasVideoRequirement: false,
    pitchesUsedThisMonth: 0,
    maxPitchesPerMonth: 0,
    subscriptionTier: 'basic',
    memberAssociation: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      checkTransferRestrictions();
    }
  }, [profile]);

  const checkTransferRestrictions = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get team information
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          subscription_tier,
          member_association,
          international_transfers_enabled,
          max_pitches_per_month,
          pitches_used_this_month,
          verified
        `)
        .eq('profile_id', profile.id)
        .single();

      if (teamError && teamError.code !== 'PGRST116') {
        throw teamError;
      }

      if (!teamData) {
        // User is an agent
        const { data: agentData } = await supabase
          .from('agents')
          .select('specialization, fifa_id')
          .eq('profile_id', profile.id)
          .single();

        setRestrictions({
          canCreatePitch: false,
          canViewInternational: true,
          canMessagePlayers: agentData?.fifa_id ? true : false,
          hasVideoRequirement: false,
          pitchesUsedThisMonth: 0,
          maxPitchesPerMonth: 0,
          subscriptionTier: 'agent',
          memberAssociation: ''
        });
        return;
      }

      // Check video requirements
      const { data: videoData } = await supabase
        .from('video_requirements')
        .select('video_count')
        .eq('team_id', teamData.id)
        .single();

      const hasEnoughVideos = (videoData?.video_count || 0) >= 5;

      // Check international restrictions
      const { data: restrictionData } = await supabase
        .from('international_transfer_restrictions')
        .select('restriction_active')
        .eq('team_id', teamData.id)
        .eq('restriction_active', true)
        .single();

      const hasInternationalRestrictions = restrictionData ? true : false;

      setRestrictions({
        canCreatePitch: teamData.verified && hasEnoughVideos && teamData.pitches_used_this_month < teamData.max_pitches_per_month,
        canViewInternational: teamData.subscription_tier === 'premium' || teamData.subscription_tier === 'enterprise',
        canMessagePlayers: teamData.verified,
        hasVideoRequirement: hasEnoughVideos,
        pitchesUsedThisMonth: teamData.pitches_used_this_month,
        maxPitchesPerMonth: teamData.max_pitches_per_month,
        subscriptionTier: teamData.subscription_tier,
        memberAssociation: teamData.member_association
      });

    } catch (error) {
      console.error('Error checking transfer restrictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const canViewPitch = (pitch: any): boolean => {
    // Basic tier can only view domestic transfers from same association
    if (restrictions.subscriptionTier === 'basic') {
      if (pitch.is_international) {
        return false;
      }
      return pitch.team?.member_association === restrictions.memberAssociation;
    }

    // Premium and enterprise can view all
    return true;
  };

  const canCreateInternationalPitch = (): boolean => {
    return restrictions.subscriptionTier === 'premium' || restrictions.subscriptionTier === 'enterprise';
  };

  const getRemainingPitches = (): number => {
    return restrictions.maxPitchesPerMonth - restrictions.pitchesUsedThisMonth;
  };

  const checkPitchCreationEligibility = (): { canCreate: boolean; reason?: string } => {
    if (!restrictions.hasVideoRequirement) {
      return { canCreate: false, reason: 'Team must have at least 5 videos to create pitches' };
    }

    if (restrictions.pitchesUsedThisMonth >= restrictions.maxPitchesPerMonth) {
      return { canCreate: false, reason: 'Monthly pitch limit reached' };
    }

    if (!profile?.is_verified) {
      return { canCreate: false, reason: 'Team profile must be verified' };
    }

    return { canCreate: true };
  };

  const validateMessageEligibility = (userType: string): { canMessage: boolean; reason?: string } => {
    if (userType === 'agent') {
      if (!restrictions.canMessagePlayers) {
        return { canMessage: false, reason: 'FIFA ID required to message football players' };
      }
    }

    return { canMessage: true };
  };

  const incrementPitchCount = async (teamId: string) => {
    try {
      // Get current pitch count
      const { data: currentTeam } = await supabase
        .from('teams')
        .select('pitches_used_this_month')
        .eq('id', teamId)
        .single();

      if (!currentTeam) throw new Error('Team not found');

      // Update with incremented count
      const newCount = (currentTeam.pitches_used_this_month || 0) + 1;
      
      const { error } = await supabase
        .from('teams')
        .update({
          pitches_used_this_month: newCount
        })
        .eq('id', teamId);

      if (error) throw error;

      // Update local state
      setRestrictions(prev => ({
        ...prev,
        pitchesUsedThisMonth: newCount
      }));
    } catch (error) {
      console.error('Error incrementing pitch count:', error);
    }
  };

  return {
    restrictions,
    loading,
    canViewPitch,
    canCreateInternationalPitch,
    getRemainingPitches,
    checkPitchCreationEligibility,
    validateMessageEligibility,
    incrementPitchCount,
    checkTransferRestrictions
  };
};
