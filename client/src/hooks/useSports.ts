import { useState, useEffect } from 'react';
import {
  getAllSports,
  getDatabaseCompatibleSports,
  type Sport,
  type AllowedSportType
} from '@/shared/utils/sportsService';

interface SportOption {
  id: string;
  label: string;
  value: string;
  isDatabaseCompatible: boolean;
}

interface UseSportsOptions {
  onlyDatabaseCompatible?: boolean;
}

export const useSports = (options?: UseSportsOptions) => {
  const [sports, setSports] = useState<SportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSports = () => {
      try {
        setLoading(true);
        setError(null);

        // Get sports based on the requested filter
        const sportsData = options?.onlyDatabaseCompatible
          ? getDatabaseCompatibleSports()
          : getAllSports();

        // Transform to UI-friendly format
        const sportsOptions = sportsData.map((sport: Sport) => ({
          id: sport.id,
          label: sport.label,
          value: sport.value,
          isDatabaseCompatible: sport.isDatabaseCompatible
        }));

        setSports(sportsOptions);
      } catch (err) {
        console.error('Error loading sports:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sports');
      } finally {
        setLoading(false);
      }
    };

    loadSports();
  }, [options?.onlyDatabaseCompatible]);

  return {
    sports,
    loading,
    error,
    isEmpty: !loading && sports.length === 0,
    databaseCompatibleSports: sports.filter(s => s.isDatabaseCompatible)
  };
};