
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Filter, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp,
  Star,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FilterState {
  position?: string;
  ageRange: [number, number];
  priceRange: [number, number];
  heightRange?: [number, number];
  foot?: 'left' | 'right' | 'both';
  contractExpiring?: boolean;
  freeAgents?: boolean;
  nationality?: string;
  sortBy: 'newest' | 'expiring' | 'highest_value' | 'most_viewed' | 'most_shortlisted';
  viewMode: 'all' | 'saved_filters';
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface ExploreFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  savedFilters: SavedFilter[];
  onSaveFilter: (name: string, filters: FilterState) => void;
  onLoadFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (filterId: string) => void;
}

const positions = [
  'Goalkeeper', 'Centre-Back', 'Left-Back', 'Right-Back', 'Defensive Midfielder',
  'Central Midfielder', 'Attacking Midfielder', 'Left Winger', 'Right Winger',
  'Centre-Forward', 'Striker'
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'highest_value', label: 'Highest Value' },
  { value: 'most_viewed', label: 'Most Viewed' },
  { value: 'most_shortlisted', label: 'Most Shortlisted' }
];

const ExploreFilters: React.FC<ExploreFiltersProps> = ({
  filters,
  onFiltersChange,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter
}) => {
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName, filters);
      setFilterName('');
      setShowSaveDialog(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      ageRange: [16, 40],
      priceRange: [0, 10000000],
      sortBy: 'newest',
      viewMode: 'all'
    });
  };

  return (
    <Card className="border-gray-700 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white font-polysans">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="text-gray-300 hover:text-rosegold"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-300 hover:text-white"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Saved Filters:</p>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((savedFilter) => (
                <Badge
                  key={savedFilter.id}
                  variant="outline"
                  className="cursor-pointer text-rosegold border-rosegold hover:bg-rosegold/10 group"
                  onClick={() => onLoadFilter(savedFilter)}
                >
                  <Star className="w-3 h-3 mr-1" />
                  {savedFilter.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFilter(savedFilter.id);
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={filters.position} onValueChange={(value) => updateFilters({ position: value })}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {positions.map((position) => (
                <SelectItem key={position} value={position} className="text-white hover:bg-gray-700">
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value as FilterState['sortBy'] })}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm">
            <Switch
              checked={filters.contractExpiring}
              onCheckedChange={(checked) => updateFilters({ contractExpiring: checked })}
            />
            <span className="text-white">Contract Expiring</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm">
            <Switch
              checked={filters.freeAgents}
              onCheckedChange={(checked) => updateFilters({ freeAgents: checked })}
            />
            <span className="text-white">Free Agents</span>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age Range */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
                </label>
                <Slider
                  value={filters.ageRange}
                  onValueChange={(value) => updateFilters({ ageRange: value as [number, number] })}
                  min={16}
                  max={40}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price Range: ${(filters.priceRange[0] / 1000000).toFixed(1)}M - ${(filters.priceRange[1] / 1000000).toFixed(1)}M
                </label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                  min={0}
                  max={10000000}
                  step={100000}
                  className="w-full"
                />
              </div>

              {/* Height Range */}
              {profile?.user_type === 'agent' && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">
                    Height Range: {filters.heightRange?.[0] || 160}cm - {filters.heightRange?.[1] || 200}cm
                  </label>
                  <Slider
                    value={filters.heightRange || [160, 200]}
                    onValueChange={(value) => updateFilters({ heightRange: value as [number, number] })}
                    min={160}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {/* Foot Preference */}
              {profile?.user_type === 'agent' && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Preferred Foot</label>
                  <Select value={filters.foot} onValueChange={(value) => updateFilters({ foot: value as FilterState['foot'] })}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Any foot" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="left" className="text-white hover:bg-gray-700">Left Foot</SelectItem>
                      <SelectItem value="right" className="text-white hover:bg-gray-700">Right Foot</SelectItem>
                      <SelectItem value="both" className="text-white hover:bg-gray-700">Both Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Clear All
          </Button>
        </div>

        {/* Save Filter Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Save Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filter name (e.g., 'Young Strikers in Spain')"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveFilter} className="bg-rosegold text-black hover:bg-rosegold/90">
                    Save
                  </Button>
                  <Button
                    onClick={() => setShowSaveDialog(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExploreFilters;
