
import { useState, useEffect } from 'react';

interface Country {
  name: {
    common: string;
    official?: string;
  };
  cca2: string;
  cca3: string;
  flag: string;
  languages?: Record<string, string>;
  currencies?: Record<string, any>;
  region?: string;
  subregion?: string;
}

interface UseCountriesReturn {
  countries: Country[];
  loading: boolean;
  error: string | null;
}

export const useCountries = (): UseCountriesReturn => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,flag,languages,currencies,region,subregion');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Sort countries alphabetically by common name
          const sortedCountries = data.sort((a, b) => 
            a.name.common.localeCompare(b.name.common)
          );
          setCountries(sortedCountries);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch countries');
        
        // Provide fallback countries data (already in alphabetical order)
        setCountries([
          {
            name: { common: 'France' },
            cca2: 'FR',
            cca3: 'FRA',
            flag: '🇫🇷',
            languages: { fra: 'French' },
            region: 'Europe'
          },
          {
            name: { common: 'Germany' },
            cca2: 'DE',
            cca3: 'DEU',
            flag: '🇩🇪',
            languages: { deu: 'German' },
            region: 'Europe'
          },
          {
            name: { common: 'Spain' },
            cca2: 'ES',
            cca3: 'ESP',
            flag: '🇪🇸',
            languages: { spa: 'Spanish' },
            region: 'Europe'
          },
          {
            name: { common: 'United Kingdom' },
            cca2: 'GB',
            cca3: 'GBR',
            flag: '🇬🇧',
            languages: { eng: 'English' },
            region: 'Europe'
          },
          {
            name: { common: 'United States' },
            cca2: 'US',
            cca3: 'USA',
            flag: '🇺🇸',
            languages: { eng: 'English' },
            region: 'Americas'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  return { countries, loading, error };
};
