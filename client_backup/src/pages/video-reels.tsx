import { useQuery } from "@tanstack/react-query";
import ContinuousVideoPlayer from "@/components/ContinuousVideoPlayer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { Video, Film, Clock, Users } from "lucide-react";
import type { Video as VideoType } from "@shared/schema";

export default function VideoReels() {
  const { data: videos = [], isLoading } = useQuery<VideoType[]>({
    queryKey: ["/api/videos"],
  });

  const playableVideos = videos.filter(v => v.fileUrl);
  const totalDuration = videos.reduce((acc, v) => {
    if (v.duration) {
      const parts = v.duration.split(':');
      if (parts.length === 2) {
        return acc + parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
    }
    return acc;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-video-reels">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            Video Reels
          </h1>
          <p className="text-muted-foreground">
            Watch all uploaded player videos in continuous playback
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            {playableVideos.length} playable videos
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {videos.length} total
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{playableVideos.length}</p>
                <p className="text-xs text-muted-foreground">Playable Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-md">
                <Film className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{videos.length}</p>
                <p className="text-xs text-muted-foreground">Total Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-md">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.floor(totalDuration / 60)}m
                </p>
                <p className="text-xs text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-md">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(videos.map(v => v.playerId).filter(Boolean)).size}
                </p>
                <p className="text-xs text-muted-foreground">Players Featured</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ContinuousVideoPlayer 
        videos={videos} 
        title="Player Video Reel"
        autoPlay={false}
      />

      {playableVideos.length === 0 && videos.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="font-medium">Videos Without Media Files</p>
            <p className="text-sm text-muted-foreground mt-2">
              {videos.length} video entries exist but none have playable media files attached.
              Upload videos with actual files to watch them here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
