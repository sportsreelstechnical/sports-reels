import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, Link2, Loader2 } from "lucide-react";
import type { Player } from "@shared/schema";

interface VideoUploadProps {
  players: Player[];
  onUpload?: (data: {
    title: string;
    matchDate?: string;
    source: string;
    playerId: string;
    competition?: string;
    opponent?: string;
    duration?: string;
    minutesPlayed?: number;
    fileUrl?: string;
  }) => void;
  onIntegrationConnect?: (source: string) => void;
  isUploading?: boolean;
}

export default function VideoUpload({ players, onUpload, onIntegrationConnect, isUploading }: VideoUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [title, setTitle] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [source, setSource] = useState("manual");
  const [playerId, setPlayerId] = useState("");
  const [competition, setCompetition] = useState("");
  const [opponent, setOpponent] = useState("");
  const [duration, setDuration] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState("90");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFileUploading, setIsFileUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"] },
    maxFiles: 1,
  });

  const uploadFileToStorage = async (file: File): Promise<string> => {
    setUploadProgress(10);
    
    const response = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type || "video/mp4",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadURL, objectPath } = await response.json();
    setUploadProgress(30);

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "video/mp4" },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    setUploadProgress(100);
    return objectPath;
  };

  const handleSubmit = async () => {
    if (!title || !playerId) return;

    try {
      setIsFileUploading(true);
      let videoUrl = fileUrl || undefined;

      if (uploadedFile) {
        videoUrl = await uploadFileToStorage(uploadedFile);
      }

      onUpload?.({
        title,
        matchDate: matchDate || undefined,
        source,
        playerId,
        competition: competition || undefined,
        opponent: opponent || undefined,
        duration: duration || undefined,
        minutesPlayed: parseInt(minutesPlayed) || 90,
        fileUrl: videoUrl,
      });

      setUploadedFile(null);
      setFileUrl("");
      setTitle("");
      setMatchDate("");
      setPlayerId("");
      setCompetition("");
      setOpponent("");
      setDuration("");
      setMinutesPlayed("90");
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsFileUploading(false);
    }
  };

  const integrations = [
    { id: "wyscout", name: "Wyscout" },
    { id: "transfermarkt", name: "Transfermarkt" },
    { id: "veo", name: "Veo Cameras" },
  ];

  const isSubmitting = isUploading || isFileUploading;

  return (
    <Card data-testid="card-video-upload">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="h-5 w-5" />
          Add Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          data-testid="dropzone-video"
        >
          <input {...getInputProps()} data-testid="input-video-file" />
          {uploadedFile ? (
            <div className="flex items-center justify-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              <span className="font-medium text-sm truncate max-w-[200px]">{uploadedFile.name}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? "Drop video here" : "Drop video or click to browse"}
              </p>
            </div>
          )}
        </div>

        {isFileUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Uploading video... {uploadProgress}%
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>or paste video URL</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-url">Video URL</Label>
          <Input 
            id="video-url" 
            value={fileUrl} 
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            data-testid="input-video-url"
            disabled={!!uploadedFile}
          />
          <p className="text-xs text-muted-foreground">
            Paste a direct link to an MP4 video file
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="video-title">Title *</Label>
            <Input 
              id="video-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Match title or description"
              data-testid="input-video-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="player-select">Primary Player *</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger id="player-select" data-testid="select-primary-player">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.firstName} {player.lastName} - {player.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="competition">Competition</Label>
              <Input 
                id="competition" 
                value={competition} 
                onChange={(e) => setCompetition(e.target.value)}
                placeholder="e.g. Premier League"
                data-testid="input-competition"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent</Label>
              <Input 
                id="opponent" 
                value={opponent} 
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. Manchester United"
                data-testid="input-opponent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="match-date">Match Date</Label>
              <Input 
                id="match-date" 
                type="date" 
                value={matchDate} 
                onChange={(e) => setMatchDate(e.target.value)}
                data-testid="input-match-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input 
                id="duration" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 90 min"
                data-testid="input-duration"
              />
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit} 
            disabled={!title || !playerId || isSubmitting}
            data-testid="button-save-video"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isFileUploading ? "Uploading Video..." : "Saving..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Save Video
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Import from Partners</p>
          <div className="grid grid-cols-3 gap-2">
            {integrations.map((integration) => (
              <Button
                key={integration.id}
                variant="outline"
                size="sm"
                onClick={() => onIntegrationConnect?.(integration.id)}
                data-testid={`button-connect-${integration.id}`}
              >
                <Link2 className="h-3 w-3 mr-1" />
                {integration.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
