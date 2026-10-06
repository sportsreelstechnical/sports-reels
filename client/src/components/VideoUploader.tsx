import React, { useCallback, useRef, useState } from "react";
import {
  type AssemblyJobPayload,
  CHUNK_SIZE_BYTES,
  type ChunkRetryState,
  ChunkUploadError,
  UploadCompletionError,
  UploadInitiationError,
  type UploadProgress,
  uploadLargeVideoToR2,
} from "../services/uploadService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldAlert,
  Clock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export type UploadStatus = "idle" | "uploading" | "assembled" | "error";

export interface VideoUploaderProps {
  /** Base URL of the backend (e.g. "http://localhost:5001"). Defaults to current origin or proxy. */
  apiBaseUrl?: string;
  /** Optional webhook callback URL override (server uses default if omitted). */
  webhookUrl?: string;
  /** Current real-time job status from SSE (e.g. "queued" | "processing" | "completed") */
  currentJobStatus?: string;
  /** Callback fired as soon as all chunks are assembled and the analysis job is queued. */
  onUploadComplete?: (job: AssemblyJobPayload) => void;
  /** Callback fired if upload fails irrecoverably. */
  onUploadError?: (error: Error) => void;
  /** Callback fired to reset job state. */
  onJobReset?: () => void;
  /** Optional custom styling override. */
  style?: React.CSSProperties;
  /** Optional custom className. */
  className?: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  apiBaseUrl = "",
  currentJobStatus,
  onUploadComplete,
  onJobReset,
  onUploadError,
  style,
  className = "",
}) => {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [progressInfo, setProgressInfo] = useState<UploadProgress | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [job, setJob] = useState<AssemblyJobPayload | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Form metadata fields
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [opponent, setOpponent] = useState<string>("");
  const [competition, setCompetition] = useState<string>("");
  const [matchDate, setMatchDate] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- File Handling ----

  const handleFile = useCallback((file: File) => {
    if (
      !file.type.startsWith("video/") &&
      !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)
    ) {
      setErrorMessage(
        "Please select a valid video file (.mp4, .mov, .mkv, .webm).",
      );
      setStatus("error");
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setProgress(0);
    setProgressInfo(null);
    setRetryNotice(null);
    setErrorMessage("");
    setJob(null);

    // Auto-populate title if empty based on file name
    setVideoTitle((prev) => {
      if (prev.trim()) return prev;
      return file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    });
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ---- Upload Execution ----

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setErrorMessage("Please select or drop a video file first.");
      setStatus("error");
      return;
    }

    if (!videoTitle.trim()) {
      setErrorMessage("Video Title is required.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setRetryNotice(null);
    setErrorMessage("");

    try {
      const result = await uploadLargeVideoToR2(selectedFile, {
        apiBaseUrl,
        jobType: "analysis",
        storageData: {
          title: videoTitle.trim(),
          opponent: opponent.trim() || null,
          competition: competition.trim() || null,
          match_date: matchDate.trim() || null,
          source: "upload",
        },
        onProgress: (p: UploadProgress) => {
          setProgress(p.percentage);
          setProgressInfo(p);
          if (p.retryState) {
            setRetryNotice(p.statusText);
          } else {
            setRetryNotice(null);
          }
        },
        onChunkRetry: (retryState: ChunkRetryState) => {
          setRetryNotice(
            `Connection issue on chunk ${retryState.partNumber}. Retrying (attempt ${retryState.attempt}/${retryState.maxAttempts})...`,
          );
        },
      });

      setJob(result.job);
      setStatus("assembled");
      onUploadComplete?.(result.job);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown upload error");
      let userMessage =
        "An unexpected error occurred during upload. Please check your network and try again.";

      if (err instanceof UploadInitiationError) {
        userMessage = `Unable to start video upload: ${error.message}`;
      } else if (err instanceof ChunkUploadError) {
        userMessage =
          "Network connection was interrupted during upload. Please check your connection and try again.";
      } else if (err instanceof UploadCompletionError) {
        userMessage = "Failed to finalize video upload. Please try again.";
      }

      setErrorMessage(userMessage);
      setStatus("error");
      onUploadError?.(error);
    }
  }, [
    selectedFile,
    videoTitle,
    opponent,
    competition,
    matchDate,
    apiBaseUrl,
    onUploadComplete,
    onUploadError,
  ]);

  // ---- Reset ----

  const handleReset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setProgressInfo(null);
    setRetryNotice(null);
    setErrorMessage("");
    setJob(null);
    setSelectedFile(null);
    setVideoTitle("");
    setOpponent("");
    setCompetition("");
    setMatchDate("");

    onJobReset?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onJobReset]);

  const isUploading = status === "uploading";
  const estimatedChunks = selectedFile
    ? Math.ceil(selectedFile.size / CHUNK_SIZE_BYTES)
    : 0;

  return (
    <Card
      className={`border-border/60 shadow-sm sticky top-6 ${className}`}
      style={style}
    >
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Upload for Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Submit video footage to trigger automated performance tagging.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {/* State 1: Assembled / Job Status View */}
        {status === "assembled" && job ? (() => {
          const effectiveStatus = (currentJobStatus || job.status || "queued").toLowerCase();
          const isProcessingState =
            effectiveStatus === "processing" ||
            effectiveStatus === "transcoding" ||
            effectiveStatus === "analyzing";
          const isCompletedState = effectiveStatus === "completed";
          const isFailedState = effectiveStatus === "failed" || effectiveStatus === "timeout";

          return (
            <div
              className={`space-y-4 p-4 rounded-lg border text-center animate-in fade-in duration-200 ${
                isCompletedState
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : isProcessingState
                    ? "bg-primary/10 border-primary/20"
                    : isFailedState
                      ? "bg-destructive/10 border-destructive/20"
                      : "bg-amber-500/10 border-amber-500/20"
              }`}
            >
              {isCompletedState ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              ) : isProcessingState ? (
                <RefreshCw className="h-10 w-10 text-primary mx-auto animate-spin" />
              ) : isFailedState ? (
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              ) : (
                <Clock className="h-10 w-10 text-amber-500 mx-auto animate-pulse" />
              )}

              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {isCompletedState
                    ? "Upload & Analysis Complete!"
                    : isProcessingState
                      ? "AI Analysis in Progress"
                      : isFailedState
                        ? "Processing Failed"
                        : "Upload Complete • Queued"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {isCompletedState
                    ? "Video chunks were assembled and tactical match event tags have been generated."
                    : isProcessingState
                      ? "Microservice worker has picked up the job and is actively analyzing footage."
                      : isFailedState
                        ? "An error occurred during video analysis. Please try uploading again."
                        : "Video chunks successfully assembled. Waiting in queue for an available microservice analysis worker."}
                </p>
              </div>

              <div className="bg-background/80 p-2.5 rounded border border-border/60 text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Job ID:</span>
                  <span className="text-foreground truncate max-w-[170px] font-semibold">
                    {job.job_id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <div className="flex items-center gap-1.5">
                    {isProcessingState ? (
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Processing
                      </span>
                    ) : isCompletedState ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    ) : isFailedState ? (
                      <span className="text-destructive font-medium capitalize">
                        Failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        Queued
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Stream:</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    SSE Connected
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full text-xs font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Upload Another Video
              </Button>
            </div>
          );
        })() : (
          /* State 2: Normal Upload Form */
          <>
            {/* Drag and Drop Zone */}
            <div
              onDragOver={isUploading ? undefined : handleDragOver}
              onDragLeave={isUploading ? undefined : handleDragLeave}
              onDrop={isUploading ? undefined : handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload video file drop area"
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : selectedFile
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : isUploading
                      ? "opacity-60 cursor-not-allowed border-border"
                      : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.mkv,.webm"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <div className="text-xs font-semibold text-foreground truncate max-w-[240px] mx-auto">
                    {selectedFile.name}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • ~
                    {estimatedChunks} chunks (10MB)
                  </p>
                  <span className="text-[10px] text-primary underline block">
                    Click or drag to replace
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto opacity-60" />
                  <p className="text-xs font-medium text-foreground">
                    Drag video file here or{" "}
                    <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    MP4, MOV, MKV, or WEBM up to 2GB
                  </p>
                </div>
              )}
            </div>

            {/* Video Metadata Inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="v3-upload-title" className="text-xs">
                  Video Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="v3-upload-title"
                  placeholder="e.g. Matchday 14 vs Rival FC"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  disabled={isUploading}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="v3-upload-opponent" className="text-xs">
                    Opponent
                  </Label>
                  <Input
                    id="v3-upload-opponent"
                    placeholder="e.g. Manchester City"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    disabled={isUploading}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="v3-upload-competition" className="text-xs">
                    Competition
                  </Label>
                  <Input
                    id="v3-upload-competition"
                    placeholder="e.g. Premier League"
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    disabled={isUploading}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="v3-upload-date" className="text-xs">
                  Match Date
                </Label>
                <Input
                  id="v3-upload-date"
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  disabled={isUploading}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Progress Section */}
            {isUploading && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[200px]">
                    {progressInfo?.statusText ?? `Uploading (${progress}%)...`}
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />

                {progressInfo && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      Chunk {progressInfo.completedChunks} of{" "}
                      {progressInfo.totalChunks}
                    </span>
                    <span>10MB Chunks</span>
                  </div>
                )}

                {/* Auto-retry alert if connection dropped */}
                {retryNotice && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{retryNotice}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </>
        )}
      </CardContent>

      {status !== "assembled" && (
        <CardFooter className="pt-2 pb-5 border-t border-border/40">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !videoTitle.trim() || isUploading}
            className="w-full text-xs font-semibold"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                Uploading Video ({progress}%)...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Analyze Video
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default VideoUploader;
