
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Plus, Search, Globe } from 'lucide-react';

interface League {
  id: string;
  name: string;
  country: string;
  sport_type: string;
  tier_level: number;
  region?: string;
  type: string;
}

export const LeagueManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchLeagues();
  }, []);

  useEffect(() => {
    filterLeagues();
  }, [leagues, searchTerm, countryFilter, typeFilter]);

  const fetchLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues_competitions')
        .select('*')
        .order('country', { ascending: true })
        .order('tier_level', { ascending: true });

      if (error) throw error;
      setLeagues(data || []);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      toast({
        title: "Error",
        description: "Failed to load leagues and competitions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLeagues = () => {
    let filtered = leagues;

    if (searchTerm) {
      filtered = filtered.filter(league =>
        league.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        league.country.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (countryFilter && countryFilter !== 'all') {
      filtered = filtered.filter(league => league.country === countryFilter);
    }

    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(league => league.type === typeFilter);
    }

    setFilteredLeagues(filtered);
  };

  const getUniqueCountries = () => {
    const countries = [...new Set(leagues.map(league => league.country))];
    return countries.sort();
  };

  const getLeagueTypeColor = (type: string) => {
    switch (type) {
      case 'league':
        return 'bg-green-100 text-green-800';
      case 'cup':
        return 'bg-blue-100 text-blue-800';
      case 'tournament':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierLevelText = (tier: number) => {
    switch (tier) {
      case 1:
        return '1st Tier';
      case 2:
        return '2nd Tier';
      case 3:
        return '3rd Tier';
      default:
        return `${tier}th Tier`;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leagues & Competitions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search leagues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {getUniqueCountries().map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="league">League</SelectItem>
                  <SelectItem value="cup">Cup</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Showing {filteredLeagues.length} of {leagues.length} competitions
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Globe className="w-4 h-4" />
              {getUniqueCountries().length} Countries
            </div>
          </div>

          {/* Leagues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeagues.map((league) => (
              <Card key={league.id} className="bg-gray-700 border-gray-600 hover:border-rosegold/50 transition-colors">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-white text-sm leading-tight">
                        {league.name}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getLeagueTypeColor(league.type)}`}>
                        {league.type.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        <span>{league.country}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Sport:</span>
                        <span className="capitalize">{league.sport_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Tier:</span>
                        <span>{getTierLevelText(league.tier_level)}</span>
                      </div>
                      {league.region && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Region:</span>
                          <span>{league.region}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLeagues.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No leagues or competitions found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
