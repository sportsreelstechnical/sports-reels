
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type DatabasePlayer = Tables<'players'>;

export interface TransferPitchValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateTransferPitchRequirements = async (
  teamId: string,
  playerId: string
): Promise<TransferPitchValidation> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check video requirements
    const { data: videoReq } = await supabase
      .from('video_requirements')
      .select('video_count')
      .eq('team_id', teamId)
      .single();

    if (!videoReq || videoReq.video_count < 5) {
      errors.push('Team must have at least 5 videos to create transfer pitches');
    }

    // Check player profile completeness
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (!player) {
      errors.push('Player not found');
      return { isValid: false, errors, warnings };
    }

    const requiredFields = [
      'full_name', 'position', 'citizenship', 'date_of_birth', 
      'height', 'weight', 'bio', 'market_value'
    ] as const;

    const missingFields = requiredFields.filter(field => 
      !player[field] || player[field] === ''
    );

    if (missingFields.length > 0) {
      errors.push(`Player profile is incomplete. Missing: ${missingFields.join(', ')}`);
    }

    // Check for team association membership (for basic tier restrictions)
    const { data: team } = await supabase
      .from('teams')
      .select('member_association')
      .eq('id', teamId)
      .single();

    if (!team?.member_association) {
      warnings.push('No member association set - pitches will be visible to all users');
    }

    // Additional validations
    if (player.market_value && player.market_value <= 0) {
      warnings.push('Player market value should be greater than 0');
    }

    if (!player.headshot_url && !player.photo_url) {
      warnings.push('Player photo recommended for better visibility');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Error validating transfer pitch requirements:', error);
    return {
      isValid: false,
      errors: ['Failed to validate requirements'],
      warnings
    };
  }
};

export const validatePlayerProfile = (player: DatabasePlayer): TransferPitchValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields = {
    full_name: 'Full Name',
    position: 'Position',
    citizenship: 'Citizenship',
    date_of_birth: 'Date of Birth',
    height: 'Height',
    weight: 'Weight',
    bio: 'Biography',
    market_value: 'Market Value'
  } as const;

  Object.entries(requiredFields).forEach(([field, label]) => {
    const value = player[field as keyof DatabasePlayer];
    if (!value || value === '') {
      errors.push(`${label} is required`);
    }
  });

  // Optional but recommended fields
  if (!player.headshot_url && !player.photo_url) {
    warnings.push('Player photo is recommended');
  }

  if (!player.jersey_number) {
    warnings.push('Jersey number is recommended');
  }

  if (!player.foot && player.position && 
      ['Centre Forward', 'Striker', 'Left Winger', 'Right Winger', 'Attacking Midfielder'].includes(player.position)) {
    warnings.push('Preferred foot is recommended for attacking players');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return currency;
  }
};

export const validateCurrency = (currency: string, isInternational: boolean): string | null => {
  const internationalCurrencies = ['USD', 'EUR', 'GBP'];
  
  if (isInternational && !internationalCurrencies.includes(currency)) {
    return 'International transfers must use USD, EUR, or GBP';
  }
  
  return null;
};

export const calculateServiceCharge = (amount: number, rate: number = 15): number => {
  return amount * (rate / 100);
};

export const formatTransferAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
