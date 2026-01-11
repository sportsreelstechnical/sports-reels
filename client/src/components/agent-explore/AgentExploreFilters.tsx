
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, X, Save, Bookmark } from 'lucide-react';

interface FilterProps {
  onFiltersChange: (filters: any) => void;
  initialFilters?: any;
}

interface PositionData {
  position: string;
  count: number;
}

interface CountryData {
  country: string;
  count: number;
}

export const AgentExploreFilters: React.FC<FilterProps> = ({
  onFiltersChange,
  initialFilters = {}
}) => {
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');
  const [position, setPosition] = useState(initialFilters.position || '');
  const [nationality, setNationality] = useState(initialFilters.nationality || '');
  const [transferType, setTransferType] = useState(initialFilters.transferType || '');
  const [ageRange, setAgeRange] = useState(initialFilters.ageRange || [16, 40]);
  const [priceRange, setPriceRange] = useState(initialFilters.priceRange || [0, 10000000]);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'newest');
  
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const filters = {
      searchTerm,
      position: position || undefined,
      nationality: nationality || undefined,
      transferType: transferType || undefined,
      ageRange,
      priceRange,
      sortBy
    };
    
    onFiltersChange(filters);
    updateActiveFilters();
  }, [searchTerm, position, nationality, transferType, ageRange, priceRange, sortBy]);

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      
      // Fetch available positions from active pitches
      const { data: pitchData, error: pitchError } = await supabase
        .from('transfer_pitches')
        .select(`
          players!transfer_pitches_player_id_fkey(position, citizenship)
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      if (pitchError) throw pitchError;

      if (pitchData) {
        // Process positions
        const positionCounts: Record<string, number> = {};
        const countryCounts: Record<string, number> = {};
        
        pitchData.forEach(pitch => {
          if (pitch.players?.position) {
            positionCounts[pitch.players.position] = (positionCounts[pitch.players.position] || 0) + 1;
          }
          if (pitch.players?.citizenship) {
            countryCounts[pitch.players.citizenship] = (countryCounts[pitch.players.citizenship] || 0) + 1;
          }
        });

        const positionsArray = Object.entries(positionCounts)
          .map(([position, count]) => ({ position, count }))
          .sort((a, b) => b.count - a.count);

        const countriesArray = Object.entries(countryCounts)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => a.country.localeCompare(b.country)) // Sort alphabetically
          .slice(0, 50); // Top 50 countries

        setPositions(positionsArray);
        setCountries(countriesArray);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateActiveFilters = () => {
    const active: string[] = [];
    if (searchTerm) active.push('search');
    if (position) active.push('position');
    if (nationality) active.push('nationality');
    if (transferType) active.push('transferType');
    if (ageRange[0] !== 16 || ageRange[1] !== 40) active.push('age');
    if (priceRange[0] !== 0 || priceRange[1] !== 10000000) active.push('price');
    setActiveFilters(active);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setPosition('');
    setNationality('');
    setTransferType('');
    setAgeRange([16, 40]);
    setPriceRange([0, 10000000]);
    setSortBy('newest');
  };

  const formatPrice = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
            {activeFilters.map(filter => (
              <Badge key={filter} variant="secondary" className="text-xs px-2 py-1 truncate max-w-[150px] sm:max-w-none">
                {filter === 'search' && `Search: ${searchTerm.length > 10 ? searchTerm.substring(0, 10) + '...' : searchTerm}`}
                {filter === 'position' && `Position: ${position}`}
                {filter === 'nationality' && `Country: ${nationality}`}
                {filter === 'transferType' && `Type: ${transferType}`}
                {filter === 'age' && `Age: ${ageRange[0]}-${ageRange[1]}`}
                {filter === 'price' && `Price: ${formatPrice(priceRange[0])}-${formatPrice(priceRange[1])}`}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Search Players</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by player name, club, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Quick Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Position */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Position</label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos.position} value={pos.position}>
                    {pos.position} ({pos.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nationality */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Nationality</label>
            <SearchableSelect
              value={nationality}
              onValueChange={setNationality}
              placeholder="All countries"
              options={countries.map(country => ({
                value: country.country,
                label: country.country,
                count: country.count
              }))}
              triggerClassName="bg-gray-700 border-gray-600 text-white"
              contentClassName="bg-gray-700 border-gray-600"
              showAllOption={true}
              allOptionLabel="All Countries"
            />
          </div>

          {/* Transfer Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Transfer Type</label>
            <Select value={transferType} onValueChange={setTransferType}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="highest_value">Highest Value</SelectItem>
                <SelectItem value="most_viewed">Most Viewed</SelectItem>
                <SelectItem value="most_shortlisted">Most Shortlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Range Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Age Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-200">
              Age Range: {ageRange[0]} - {ageRange[1]} years
            </label>
            <Slider
              value={ageRange}
              onValueChange={setAgeRange}
              max={40}
              min={16}
              step={1}
              className="w-full"
            />
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-200">
              Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
            </label>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={10000000}
              min={0}
              step={100000}
              className="w-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Load Saved
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
