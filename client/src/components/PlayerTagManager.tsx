
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Tag } from 'lucide-react';

interface PlayerTag {
  id: string;
  label: string;
  color: string;
  description?: string;
  is_system_tag?: boolean;
}

interface PlayerTagManagerProps {
  playerId: string;
  playerTags: PlayerTag[];
  availableTags: PlayerTag[];
  onAddTag: (playerId: string, tagId: string) => void;
  onRemoveTag: (playerId: string, tagId: string) => void;
  onCreateTag?: (tag: Omit<PlayerTag, 'id'>) => void;
  loading?: boolean;
}

const predefinedColors = [
  { name: 'Red', value: 'bg-red-500', text: 'text-red-50' },
  { name: 'Green', value: 'bg-green-500', text: 'text-green-50' },
  { name: 'Blue', value: 'bg-blue-500', text: 'text-blue-50' },
  { name: 'Yellow', value: 'bg-yellow-500', text: 'text-yellow-50' },
  { name: 'Purple', value: 'bg-purple-500', text: 'text-purple-50' },
  { name: 'Orange', value: 'bg-orange-500', text: 'text-orange-50' },
  { name: 'Pink', value: 'bg-pink-500', text: 'text-pink-50' },
  { name: 'Indigo', value: 'bg-indigo-500', text: 'text-indigo-50' },
  { name: 'Gray', value: 'bg-gray-500', text: 'text-gray-50' },
];

export const PlayerTagManager: React.FC<PlayerTagManagerProps> = ({
  playerId,
  playerTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  loading = false
}) => {
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState(predefinedColors[0].value);
  const [newTagDescription, setNewTagDescription] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const addTagToPlayer = (tag: PlayerTag) => {
    if (!playerTags.find(pt => pt.id === tag.id)) {
      onAddTag(playerId, tag.id);
    }
  };

  const removeTagFromPlayer = (tagId: string) => {
    onRemoveTag(playerId, tagId);
  };

  const createNewTag = async () => {
    if (!newTagLabel.trim() || !onCreateTag) return;
    
    setIsCreating(true);
    
    const newTag = {
      label: newTagLabel.trim(),
      color: newTagColor,
      description: newTagDescription.trim()
    };

    await onCreateTag(newTag);

    setNewTagLabel('');
    setNewTagDescription('');
    setIsCreatingTag(false);
    setIsCreating(false);
  };

  const getTextColor = (bgColor: string) => {
    const colorObj = predefinedColors.find(c => c.value === bgColor);
    return colorObj?.text || 'text-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bright-pink"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Player Tags */}
      {playerTags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Current Tags:</h4>
          <div className="flex flex-wrap gap-2">
            {playerTags.map((tag) => (
              <Badge
                key={tag.id}
                className={`${tag.color} ${getTextColor(tag.color)} flex items-center gap-1`}
              >
                {tag.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-white/20"
                  onClick={() => removeTagFromPlayer(tag.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Existing Tags */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-bright-pink" />
              <span className="text-sm font-medium text-white">Add Tags</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableTags
                .filter(tag => !playerTags.find(pt => pt.id === tag.id))
                .map((tag) => (
                  <Button
                    key={tag.id}
                    variant="outline"
                    size="sm"
                    className="justify-start border-gray-600 hover:bg-gray-700"
                    onClick={() => addTagToPlayer(tag)}
                  >
                    <div className={`w-3 h-3 rounded-full ${tag.color} mr-2`} />
                    <span className="text-white text-xs">{tag.label}</span>
                  </Button>
                ))}
            </div>

            {/* Create New Tag */}
            <div className="border-t border-gray-700 pt-3">
              {!isCreatingTag ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingTag(true)}
                  className="w-full border-gray-600 text-gray-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Tag
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Tag label (e.g., Injured, For Sale)"
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  
                  <div className="grid grid-cols-3 gap-1">
                    {predefinedColors.map((color) => (
                      <Button
                        key={color.value}
                        variant="outline"
                        size="sm"
                        className={`${color.value} ${color.text} border-2 ${
                          newTagColor === color.value ? 'border-white' : 'border-transparent'
                        }`}
                        onClick={() => setNewTagColor(color.value)}
                      >
                        {color.name}
                      </Button>
                    ))}
                  </div>

                  <Input
                    placeholder="Description (optional)"
                    value={newTagDescription}
                    onChange={(e) => setNewTagDescription(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={createNewTag}
                      size="sm"
                      className="flex-1 bg-bright-pink hover:bg-bright-pink/90"
                      disabled={!newTagLabel.trim() || isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Tag'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingTag(false)}
                      className="border-gray-600"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
