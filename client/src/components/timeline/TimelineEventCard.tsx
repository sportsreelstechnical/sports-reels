
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Pin, 
  MessageCircle, 
  Heart,
  ExternalLink,
  Play,
  FileText,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EventIcon, EventBadge } from './TimelineEventIcons';
import { useTimelineNavigation } from '@/utils/timelineNavigation';

interface TimelineEvent {
  id: string;
  team_id: string;
  event_type: 'match' | 'transfer' | 'player' | 'team' | 'achievement';
  title: string;
  description: string;
  event_date: string;
  created_at: string;
  metadata?: any;
  is_pinned: boolean;
  player_id?: string;
  match_id?: string;
  created_by: string;
  reactions_count: number;
  comments_count: number;
  players?: {
    id: string;
    full_name: string;
    photo_url?: string;
  };
}

interface TimelineEventCardProps {
  event: TimelineEvent;
  onTogglePin: (eventId: string, currentPinned: boolean) => void;
  onOpenComments: (eventId: string) => void;
  onEditEvent?: (event: TimelineEvent) => void;
  onDeleteEvent?: (event: TimelineEvent) => void;
  onOpenMessaging?: (event: TimelineEvent) => void;
  canEdit?: boolean;
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event,
  onTogglePin,
  onOpenComments,
  onEditEvent,
  onDeleteEvent,
  onOpenMessaging,
  canEdit = false
}) => {
  const navigation = useTimelineNavigation();

  const handlePlayerClick = () => {
    if (event.player_id && event.players) {
      navigation.navigateToPlayerProfile(event.player_id, event.players.full_name);
    }
  };

  const handleMatchVideoClick = () => {
    if (event.match_id) {
      navigation.navigateToMatchVideo(event.match_id, event.title);
    }
  };

  const handleTransferPitchClick = () => {
    if (event.metadata?.pitch_id) {
      navigation.navigateToTransferPitch(event.metadata.pitch_id);
    }
  };

  const renderActionButton = () => {
    switch (event.event_type) {
      case 'match':
        if (event.match_id) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMatchVideoClick}
              className="text-green-400 border-green-400 hover:bg-green-400/10 h-9 sm:h-10 text-sm sm:text-base"
            >
              <Play className="w-4 h-4 mr-1" />
              Watch Video
            </Button>
          );
        }
        break;
      
      case 'player':
        if (event.player_id) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlayerClick}
              className="text-purple-400 border-purple-400 hover:bg-purple-400/10 h-9 sm:h-10 text-sm sm:text-base"
            >
              <User className="w-4 h-4 mr-1" />
              View Profile
            </Button>
          );
        }
        break;
      
      case 'transfer':
        if (event.metadata?.pitch_id) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTransferPitchClick}
              className="text-blue-400 border-blue-400 hover:bg-blue-400/10 h-9 sm:h-10 text-sm sm:text-base"
            >
              <FileText className="w-4 h-4 mr-1" />
              View Pitch
            </Button>
          );
        }
        break;
    }
    return null;
  };

  return (
    <Card className="border-gray-700 hover:border-rosegold/30 transition-all duration-200 group">
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          {/* Icon and Pin */}
          <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-3 relative">
            <div className="p-2 sm:p-2.5 bg-gray-800 rounded-full group-hover:bg-gray-700 transition-colors">
              <EventIcon type={event.event_type} />
            </div>
            {event.is_pinned && (
              <Pin className="w-4 h-4 text-yellow-500" />
            )}
            {/* Timeline connector line */}
            <div className="hidden sm:block w-px bg-gray-700 flex-1 group-last:hidden" />
          </div>

          {/* Content */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-semibold text-white group-hover:text-rosegold transition-colors">
                  {event.title}
                </h3>
                <EventBadge type={event.event_type} />
                {event.is_pinned && (
                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    Pinned
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Edit/Delete buttons for team members */}
                {canEdit && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditEvent?.(event)}
                      className="text-gray-400 hover:text-blue-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                      title="Edit Event"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteEvent?.(event)}
                      className="text-gray-400 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                
                {/* Messaging button for transfer events */}
                {event.event_type === 'transfer' && onOpenMessaging && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenMessaging(event)}
                    className="text-gray-400 hover:text-green-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    title="Open Messaging"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTogglePin(event.id, event.is_pinned)}
                  className="text-gray-400 hover:text-yellow-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                >
                  <Pin className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm sm:text-base text-gray-300 mb-3 leading-relaxed break-words">
              {event.description}
            </p>

            {/* Player info with clickable link */}
            {event.players && (
              <div className="flex items-center gap-2 mb-3 text-sm sm:text-base">
                <User className="w-4 h-4 text-gray-400" />
                <button
                  onClick={handlePlayerClick}
                  className="text-rosegold hover:text-rosegold/80 transition-colors underline decoration-dotted"
                >
                  {event.players.full_name}
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(event.event_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDistanceToNow(new Date(event.created_at))} ago
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {renderActionButton()}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpenComments(event.id)}
                  className="text-gray-400 hover:text-blue-400"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {event.comments_count || 0}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-red-400"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  {event.reactions_count || 0}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineEventCard;
