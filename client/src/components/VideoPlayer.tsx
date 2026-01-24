import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, X, Calendar, Clock, Trophy, Users, Video } from "lucide-react";
import { useMediaUrls } from "@/hooks/useMediaUrls";
import type { Video as VideoType } from "@shared/schema";

interface VideoPlayerProps {
  video: VideoType | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoPlayer({ video, isOpen, onClose }: VideoPlayerProps) {
  const isR2Key = video?.fileUrl?.startsWith("sports-reels/");
  const { videoUrl: signedVideoUrl, loading } = useMediaUrls(
    isR2Key ? video?.fileUrl : undefined,
    undefined,
    7200
  );

  const videoSrc = isR2Key ? signedVideoUrl : video?.fileUrl;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Video Player
            </DialogTitle>
            <DialogDescription>
              {video?.title}
            </DialogDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-video-player"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="space-y-4 pr-4">
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading video...</p>
                </div>
              ) : videoSrc ? (
                <video
                  controls
                  autoPlay
                  className="w-full h-full rounded-md"
                  src={videoSrc}
                  data-testid="video-player-element"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No Video Available</p>
                  <p className="text-sm mt-2">This video has no playable file attached.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {video?.matchDate && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <Calendar className="h-3 w-3" />
                    Match Date
                  </div>
                  <p className="font-medium">{video.matchDate}</p>
                </div>
              )}
              {video?.competition && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <Trophy className="h-3 w-3" />
                    Competition
                  </div>
                  <p className="font-medium">{video.competition}</p>
                </div>
              )}
              {video?.opponent && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <Users className="h-3 w-3" />
                    Opponent
                  </div>
                  <p className="font-medium">{video.opponent}</p>
                </div>
              )}
              {video?.duration && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <Clock className="h-3 w-3" />
                    Duration
                  </div>
                  <p className="font-medium">{video.duration}</p>
                </div>
              )}
            </div>

            {video?.minutesPlayed && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {video.minutesPlayed} minutes played
                </Badge>
                {video.processed && (
                  <Badge variant="outline">AI Analyzed</Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Source: {video?.source || "Manual Upload"}</span>
              {video?.uploadDate && (
                <span>Uploaded: {new Date(video.uploadDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="default" onClick={onClose} data-testid="button-exit-video-player">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
