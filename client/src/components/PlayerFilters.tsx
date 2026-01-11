import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Save, Download } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useSportData } from '@/hooks/useSportData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type DatabasePlayer = Tables<'players'>;

interface FilterState {
  search: string;
  position: string;
  ageMin: string;
  ageMax: string;
  heightMin: string;
  heightMax: string;
  citizenship: string;
  contractExpiry: string;
  marketValueMin: string;
  marketValueMax: string;
  availability: string;
  tags: string[];
}

interface PlayerFiltersProps {
  players: DatabasePlayer[];
  onFilteredPlayersChange: (filteredPlayers: DatabasePlayer[]) => void;
  onExportPlayers: (players: DatabasePlayer[]) => void;
}

const PlayerFilters: React.FC<PlayerFiltersProps> = ({
  players,
  onFilteredPlayersChange,
  onExportPlayers
}) => {
  const { profile } = useAuth();
  const [teamSportType, setTeamSportType] = useState<string>('football');
  const sportData = useSportData(teamSportType);
  
  console.log('🏈 PlayerFilters: Sport data debug:', {
    teamSportType,
    sportData: sportData ? {
      positions: sportData.positions,
      positionsCount: sportData.positions?.length
    } : 'No sport data'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    position: 'all',
    ageMin: '',
    ageMax: '',
    heightMin: '',
    heightMax: '',
    citizenship: 'all',
    contractExpiry: 'all',
    marketValueMin: '',
    marketValueMax: '',
    availability: 'all',
    tags: []
  });

  const [savedFilters, setSavedFilters] = useState<{name: string, filters: FilterState}[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch team sport type on component mount
  useEffect(() => {
    const fetchTeamSportType = async () => {
      if (!profile?.id) return;

      try {
        const { data, error } = await supabase
          .from('teams')
          .select('sport_type')
          .eq('profile_id', profile.id)
          .single();

        if (error) {
          console.error('Error fetching team sport type:', error);
          return;
        }

        if (data?.sport_type) {
          console.log('🏈 PlayerFilters: Team sport type fetched:', data.sport_type);
          setTeamSportType(data.sport_type);
        } else {
          console.log('🏈 PlayerFilters: No sport type found in team data:', data);
        }
      } catch (error) {
        console.error('Error fetching team sport type:', error);
      }
    };

    fetchTeamSportType();
  }, [profile]);

  const applyFilters = (filterState: FilterState = filters) => {
    let filtered = [...players];

    console.log('🔍 Applying filters:', {
      search: filterState.search,
      totalPlayers: players.length,
      initialFiltered: filtered.length
    });

    // Search filter
    if (filterState.search) {
      const searchLower = filterState.search.toLowerCase();
      const beforeSearch = filtered.length;
      filtered = filtered.filter(player => 
        player.full_name?.toLowerCase().includes(searchLower) ||
        player.position?.toLowerCase().includes(searchLower) ||
        player.citizenship?.toLowerCase().includes(searchLower)
      );
      console.log('🔍 Search filter applied:', {
        searchTerm: filterState.search,
        beforeSearch,
        afterSearch: filtered.length,
        matches: filtered.map(p => p.full_name)
      });
    }

    // Position filter
    if (filterState.position && filterState.position !== 'all') {
      const beforePosition = filtered.length;
      filtered = filtered.filter(player => player.position === filterState.position);
      console.log('🏈 Position filter applied:', {
        position: filterState.position,
        beforePosition,
        afterPosition: filtered.length,
        matches: filtered.map(p => ({ name: p.full_name, position: p.position }))
      });
    }

    // Age range filter
    if (filterState.ageMin || filterState.ageMax) {
      filtered = filtered.filter(player => {
        if (!player.age) return false;
        const ageMin = filterState.ageMin ? parseInt(filterState.ageMin) : 0;
        const ageMax = filterState.ageMax ? parseInt(filterState.ageMax) : 100;
        return player.age >= ageMin && player.age <= ageMax;
      });
    }

    // Height range filter
    if (filterState.heightMin || filterState.heightMax) {
      filtered = filtered.filter(player => {
        if (!player.height) return false;
        const heightMin = filterState.heightMin ? parseInt(filterState.heightMin) : 0;
        const heightMax = filterState.heightMax ? parseInt(filterState.heightMax) : 300;
        return player.height >= heightMin && player.height <= heightMax;
      });
    }

    // Citizenship filter
    if (filterState.citizenship && filterState.citizenship !== 'all') {
      filtered = filtered.filter(player => player.citizenship === filterState.citizenship);
    }

    // Contract expiry filter
    if (filterState.contractExpiry && filterState.contractExpiry !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filterState.contractExpiry) {
        case 'expiring_soon':
          cutoffDate.setMonth(now.getMonth() + 6);
          filtered = filtered.filter(player => 
            player.contract_expires && new Date(player.contract_expires) <= cutoffDate
          );
          break;
        case 'expired':
          filtered = filtered.filter(player => 
            player.contract_expires && new Date(player.contract_expires) <= now
          );
          break;
        case 'long_term':
          cutoffDate.setFullYear(now.getFullYear() + 2);
          filtered = filtered.filter(player => 
            player.contract_expires && new Date(player.contract_expires) >= cutoffDate
          );
          break;
      }
    }

    // Market value range filter
    if (filterState.marketValueMin || filterState.marketValueMax) {
      filtered = filtered.filter(player => {
        if (!player.market_value) return false;
        const valueMin = filterState.marketValueMin ? parseFloat(filterState.marketValueMin) : 0;
        const valueMax = filterState.marketValueMax ? parseFloat(filterState.marketValueMax) : Infinity;
        return player.market_value >= valueMin && player.market_value <= valueMax;
      });
    }

    console.log('📤 Sending filtered players to parent:', {
      filteredCount: filtered.length,
      totalCount: players.length,
      searchTerm: filterState.search
    });
    onFilteredPlayersChange(filtered);
  };

  const updateFilter = (key: keyof FilterState, value: string | string[]) => {
    console.log('🔄 Filter update:', { key, value, currentFilters: filters });
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      search: '',
      position: 'all',
      ageMin: '',
      ageMax: '',
      heightMin: '',
      heightMax: '',
      citizenship: 'all',
      contractExpiry: 'all',
      marketValueMin: '',
      marketValueMax: '',
      availability: 'all',
      tags: []
    };
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  const saveCurrentFilter = () => {
    const name = prompt('Enter filter name:');
    if (name) {
      setSavedFilters(prev => [...prev, { name, filters }]);
    }
  };

  const loadSavedFilter = (savedFilter: {name: string, filters: FilterState}) => {
    setFilters(savedFilter.filters);
    applyFilters(savedFilter.filters);
  };

  const getUniqueValues = (field: keyof DatabasePlayer): string[] => {
    const values = players
      .map(p => {
        const value = p[field];
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      })
      .filter((value): value is string => Boolean(value));
    
    return [...new Set(values)];
  };

  return (
    <Card className="border-gray-700 mb-4 sm:mb-6">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-white font-polysans flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Player Filters
          </CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-white border-gray-600 hover:bg-gray-700 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-initial"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Advanced Filters</span>
              <span className="sm:hidden">Advanced</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentFilter}
              className="text-white border-gray-600 hover:bg-gray-700 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-initial"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="hidden lg:inline">Save Filter</span>
              <span className="lg:hidden">Save</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportPlayers(players)}
              className="text-white border-gray-600 hover:bg-gray-700 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-initial"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
        {/* Basic Search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <Label className="text-white text-xs sm:text-sm mb-1.5 block">Search Players</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
              <Input
                placeholder="Search by name, position, nationality..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9 sm:pl-10 bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>
          
          <div className="w-full sm:w-40">
            <Label className="text-white text-xs sm:text-sm mb-1.5 block">Position</Label>
            <Select value={filters.position} onValueChange={(value) => updateFilter('position', value)}>
              <SelectTrigger className="bg-gray-700 text-white border-gray-600 w-full h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all" className="text-white text-xs sm:text-sm">All positions</SelectItem>
                {sportData?.positions?.length > 0 ? (
                  sportData.positions.map((position) => (
                    <SelectItem key={position} value={position} className="text-white text-xs sm:text-sm">
                      {position}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-positions" disabled className="text-gray-400 text-xs sm:text-sm">
                    Loading positions...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {(filters.search || (filters.position !== 'all') || (filters.citizenship !== 'all')) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-white border-gray-600 hover:bg-gray-700 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg">
            <div>
              <Label className="text-white text-xs sm:text-sm mb-1.5 block">Age Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.ageMin}
                  onChange={(e) => updateFilter('ageMin', e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.ageMax}
                  onChange={(e) => updateFilter('ageMax', e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-white text-xs sm:text-sm mb-1.5 block">Height Range (cm)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.heightMin}
                  onChange={(e) => updateFilter('heightMin', e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.heightMax}
                  onChange={(e) => updateFilter('heightMax', e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-white text-xs sm:text-sm mb-1.5 block">Market Value Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.marketValueMin}
                  onChange={(e) => updateFilter('marketValueMin', e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.marketValueMax}
                  onChange={(e) => updateFilter('marketValueMax', e.target.value)}
                  className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-white text-xs sm:text-sm mb-1.5 block">Citizenship</Label>
              <Select value={filters.citizenship} onValueChange={(value) => updateFilter('citizenship', value)}>
                <SelectTrigger className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white text-xs sm:text-sm">All countries</SelectItem>
                  {getUniqueValues('citizenship').map((country, index) => (
                    <SelectItem key={`country-${index}`} value={country} className="text-white text-xs sm:text-sm">{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white text-xs sm:text-sm mb-1.5 block">Contract Status</Label>
              <Select value={filters.contractExpiry} onValueChange={(value) => updateFilter('contractExpiry', value)}>
                <SelectTrigger className="bg-gray-700 text-white border-gray-600 h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="All contracts" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white text-xs sm:text-sm">All contracts</SelectItem>
                  <SelectItem value="expiring_soon" className="text-white text-xs sm:text-sm">Expiring in 6 months</SelectItem>
                  <SelectItem value="expired" className="text-white text-xs sm:text-sm">Expired</SelectItem>
                  <SelectItem value="long_term" className="text-white text-xs sm:text-sm">Long-term (2+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div>
            <Label className="text-white text-xs sm:text-sm mb-2 block">Saved Filters</Label>
            <div className="flex gap-2 flex-wrap">
              {savedFilters.map((saved, index) => (
                <Badge
                  key={`saved-filter-${index}`}
                  variant="outline"
                  className="cursor-pointer hover:bg-rosegold text-white border-gray-600 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5"
                  onClick={() => loadSavedFilter(saved)}
                >
                  {saved.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerFilters;
