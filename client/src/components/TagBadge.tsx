
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PlayerTag {
  id: string;
  label: string;
  color: string;
  description?: string;
}

interface TagBadgeProps {
  tag: PlayerTag;
  size?: 'sm' | 'md' | 'lg';
  showRemove?: boolean;
  onRemove?: () => void;
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

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'sm',
  showRemove = false,
  onRemove
}) => {
  const getTextColor = (bgColor: string) => {
    const colorObj = predefinedColors.find(c => c.value === bgColor);
    return colorObj?.text || 'text-white';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge
      className={`${tag.color} ${getTextColor(tag.color)} ${sizeClasses[size]} flex items-center gap-1 font-medium`}
      title={tag.description}
    >
      {tag.label}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-white/20 rounded-full ml-1 w-4 h-4 flex items-center justify-center"
        >
          ×
        </button>
      )}
    </Badge>
  );
};
