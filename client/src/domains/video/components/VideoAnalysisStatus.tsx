
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SmartThumbnail } from './SmartThumbnail';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  FileVideo,
  Calendar,
  Users,
  Target
} from 'lucide-react';

interface VideoAnalysisStatusProps {
  video: {
    id: string;
    title: string;
    video_type: string;
    ai_analysis_status: 'pending' | 'completed' | 'failed';
    ai_analysis?: any;
    thumbnail_url?: string;
    created_at: string;
    opposing_team?: string;
    score?: string;
    tagged_players?: string[];
  };
  onRetry?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

export const VideoAnalysisStatus: React.FC<VideoAnalysisStatusProps> = ({
  video,
  onRetry,
  onDelete,
  onView
}) => {
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusIcon = () => {
    switch (video.ai_analysis_status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (video.ai_analysis_status) {
      case 'pending':
        return 'AI Analysis in Progress';
      case 'completed':
        return 'Analysis Complete';
      case 'failed':
        return 'Analysis Failed';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = () => {
    switch (video.ai_analysis_status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      // Update status to pending
      await supabase
        .from('videos')
        .update({ ai_analysis_status: 'pending' })
        .eq('id', video.id);

      onRetry();

      toast({
        title: "Retry Started",
        description: "AI analysis has been restarted for this video.",
      });
    } catch (error) {
      console.error('Error retrying analysis:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to restart AI analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      onDelete();

      toast({
        title: "Video Deleted",
        description: "The video has been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatVideoType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden">
              <SmartThumbnail
                thumbnailUrl={video.thumbnail_url}
                title={video.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <CardTitle className="text-white text-lg mb-1">
                {video.title}
              </CardTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {formatVideoType(video.video_type)}
                </Badge>
                <Badge className={`text-xs ${getStatusColor()}`}>
                  {getStatusIcon()}
                  <span className="ml-1">{getStatusText()}</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
          </div>

          {video.video_type === 'match' && video.opposing_team && (
            <div className="flex items-center gap-2 text-gray-400">
              <Target className="w-4 h-4" />
              <span>vs {video.opposing_team}</span>
            </div>
          )}

          {video.video_type === 'match' && video.score && (
            <div className="flex items-center gap-2 text-gray-400">
              <span>Score: {video.score}</span>
            </div>
          )}

          {video.tagged_players && video.tagged_players.length > 0 && (
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{video.tagged_players.length} players tagged</span>
            </div>
          )}
        </div>

        {/* Analysis Preview */}
        {video.ai_analysis_status === 'completed' && video.ai_analysis?.analysis && (
          <div className="bg-gray-700/50 rounded-lg p-3">
            <h4 className="text-white font-medium mb-2">Analysis Summary</h4>
            <p className="text-gray-300 text-sm line-clamp-3">
              {video.ai_analysis.analysis.substring(0, 200)}...
            </p>
          </div>
        )}

        {/* Error Message */}
        {video.ai_analysis_status === 'failed' && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              AI analysis failed. The video has been saved but couldn't be analyzed.
              You can retry the analysis or delete the video.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {video.ai_analysis_status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Analysis
            </Button>
          )}

          {video.ai_analysis_status === 'failed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 border-blue-600 text-blue-300 hover:bg-blue-900/20"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Retry Analysis
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="border-red-600 text-red-300 hover:bg-red-900/20"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
