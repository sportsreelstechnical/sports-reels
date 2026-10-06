import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import VideoUploader from "@/components/VideoUploader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useJobStatus } from "@/hooks/useJobStatus";
import {
  type AssemblyJobPayload,
  type EventTagFilters,
  type ExportFormat,
  type FetchEventTagsResult,
  type MatchTag,
  type ProcessedVideo,
  type VerifyTagsResponse,
  exportMatchTags,
  fetchEventTags,
  fetchProcessedVideos,
  formatSecondsToTimestamp,
  patchEventTagQA,
  verifyVideoTags,
} from "@/services/uploadService";
import {
  Video as VideoIcon,
  Play,
  Clock,
  Tag,
  X,
  Sparkles,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Shield,
  User,
  Film,
  Download,
  Edit2,
  FileSpreadsheet,
  FileCode,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { SignedVideoPlayer } from "@/components/SignedVideoPlayer";

export default function VideoAnalysis() {
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Backend URL configuration (defaults to relative "" for dev proxy and session cookie propagation)
  const defaultApiBase = import.meta.env.VITE_BACKEND_URL || "";
  const serviceBase =
    import.meta.env.VIDEO_SERVICE_BASE_URL || "http://localhost:8000";

  // =========================================================================
  // RBAC: Client-Side Role-Based Access Control
  // - Full suite (uploading, QA editing, tag verification) is restricted to the "team" role.
  // - Non-team roles (scouts, agents, embassy, federation, viewers) have restrictions:
  //   1. Video uploader component isn't available on page load (only processed videos show full-width).
  //   2. Cannot edit event tags (QA edit tool button and modal are unavailable).
  //   3. Cannot verify video tags (Verify All Tags button is unavailable).
  // =========================================================================
  const isTeamRole = useMemo(() => {
    // Dev override parameter (?roleOverride=team / ?roleOverride=scout) for testing
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const override = params.get("roleOverride") || params.get("role");
      if (override === "team") return true;
      if (
        override === "scout" ||
        override === "agent" ||
        override === "viewer" ||
        override === "readonly" ||
        override === "embassy"
      ) {
        return false;
      }
    }

    if (!user && !profile) return false;

    // Check profile user_type mapping (team vs agent)
    if (profile?.user_type === "team") return true;

    // Check role against Team roles and Admin
    const role = (user?.role || profile?.role || "").toLowerCase();
    const teamRoles = ["team", "sporting_director", "coach", "legal", "admin"];
    if (teamRoles.includes(role)) return true;

    if (
      user?.teamId &&
      !["scout", "agent", "embassy", "federation_admin"].includes(role)
    ) {
      return true;
    }

    return false;
  }, [user, profile]);

  // Processed Videos Gallery State
  const [processedVideos, setProcessedVideos] = useState<ProcessedVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videoSearchQuery, setVideoSearchQuery] = useState<string>("");

  // Focused / Selected Video State
  const [selectedVideo, setSelectedVideo] = useState<ProcessedVideo | null>(
    null
  );

  // Upload & Pipeline State
  const [activeJob, setActiveJob] = useState<AssemblyJobPayload | null>(null);

  // SSE Live status hook for active background analysis
  const {
    status: sseStatus,
    event: sseEvent,
    error: sseError,
    isConnecting,
    isQueued,
    isProcessing,
    isCompleted,
  } = useJobStatus(activeJob?.job_id, );

  // Event tags timeline state for the focused video
  const [timelineData, setTimelineData] = useState<FetchEventTagsResult | null>(
    null
  );
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  // Video Player Ref & Active Highlighted Tag State
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Tag filters state (inside focused video)
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [playerFilter, setPlayerFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [verifiedOnlyFilter, setVerifiedOnlyFilter] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] =
    useState<boolean>(false);

  // QA Editing modal state
  const [editingTag, setEditingTag] = useState<MatchTag | null>(null);
  const [qaEventType, setQaEventType] = useState<string>("");
  const [qaOutcome, setQaOutcome] = useState<string>("");
  const [isSubmittingQA, setIsSubmittingQA] = useState<boolean>(false);

  // Verification state
  const [isTagsVerified, setIsTagsVerified] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Resolve signed media URL if file_url is an S3/R2 storage key
  const isR2Key =
    selectedVideo?.file_url &&
    !selectedVideo.file_url.startsWith("http") &&
    !selectedVideo.file_url.startsWith("/") &&
    !selectedVideo.file_url.startsWith("blob:");


  const loadProcessedVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    setVideosError(null);

    try {
      const videos = await fetchProcessedVideos(defaultApiBase);
      setProcessedVideos(videos);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch processed videos";
      setVideosError(msg);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [defaultApiBase]);

  // Initial load on page mount
  useEffect(() => {
    loadProcessedVideos();
  }, [loadProcessedVideos]);


  const loadEventTags = useCallback(
    async (videoId: string, appliedFilters?: EventTagFilters) => {
      setIsLoadingTags(true);
      setTagsError(null);

      try {
        const result = await fetchEventTags(videoId, {
          apiBaseUrl: defaultApiBase,
          filters: appliedFilters,
        });
        setTimelineData(result);
      } catch (err) {
        setTagsError(
          err instanceof Error
            ? err.message
            : "Failed to retrieve match event tags"
        );
      } finally {
        setIsLoadingTags(false);
      }
    },
    [defaultApiBase]
  );

  // Focus on Video
  const handleSelectVideo = useCallback(
    (video: ProcessedVideo) => {
      setSelectedVideo(video);
      setSelectedTagId(null);
      setCurrentVideoTime(0);
      setIsTagsVerified(Boolean(video.is_tags_verified));
      setVerifiedAt(video.verified_at || null);

      loadEventTags(video.id);
    },
    [loadEventTags]
  );

  // Close Tags Button (Return to All Processed Videos)
  const handleCloseTags = useCallback(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
    }
    setSelectedVideo(null);
    setTimelineData(null);
    setSelectedTagId(null);
    setCurrentVideoTime(0);
    setTagsError(null);
  }, []);

  // Tag Click Handler (Seek Video to Highlighted Moment)
  const handleTagClick = useCallback(
    (tag: MatchTag) => {
      setSelectedTagId(tag.id);

      const targetSeconds =
        typeof tag.match_time_sec === "number" ? tag.match_time_sec : 0;

      setCurrentVideoTime(targetSeconds);

      if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = targetSeconds;
        videoPlayerRef.current.play().catch(() => {});
      }

      toast({
        title: `Jumped to ${
          tag.timestamp_str ||
          tag.timestamp ||
          formatSecondsToTimestamp(targetSeconds)
        }`,
        description: `${
          tag.structured_payload?.event_type?.toUpperCase() || "EVENT"
        }: ${tag.natural_language_output || "Highlighted moment"}`,
      });
    },
    [toast]
  );

  // Video Player Time Update Listener
  const handleVideoTimeUpdate = () => {
    if (!videoPlayerRef.current) return;
    const time = videoPlayerRef.current.currentTime;
    setCurrentVideoTime(time);

    // Sync active tag indicator if video reaches a tag
    const events = timelineData?.timeline?.events;
    if (events && events.length > 0) {
      const matchingTag = events.find(
        (t) => Math.abs((t.match_time_sec ?? 0) - time) <= 3
      );
      if (matchingTag && matchingTag.id !== selectedTagId) {
        setSelectedTagId(matchingTag.id);
      }
    }
  };

  // SSE Trigger: Refresh videos and tags when background processing completes
  useEffect(() => {
    if (sseStatus === "completed" && activeJob) {
      const videoId = sseEvent?.video_id || activeJob.video_id;
      loadProcessedVideos();

      // Automatically focus on the newly analyzed video
      const newVideoObj: ProcessedVideo = {
        id: videoId,
        title:
          activeJob.storage_data?.title ||
          activeJob.video_key ||
          `Video ${videoId.slice(0, 8)}`,
        file_url: sseEvent?.compressed_key || null,
        processed: true,
        is_tags_verified: false,
        upload_date: new Date().toISOString(),
        opponent: activeJob.storage_data?.opponent || null,
        competition: activeJob.storage_data?.competition || null,
      };

      setSelectedVideo(newVideoObj);
      loadEventTags(videoId);

      toast({
        title: "Video Analysis Complete!",
        description:
          "Background processing and event tagging completed successfully.",
      });
    }
  }, [
    sseStatus,
    sseEvent,
    activeJob,
    loadEventTags,
    loadProcessedVideos,
    toast,
  ]);

  // SSE Transition Trigger: Inform user when worker picks up queued job and starts processing
  const prevSseStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      prevSseStatusRef.current === "queued" &&
      sseStatus === "processing" &&
      activeJob
    ) {
      toast({
        title: "Processing Started",
        description: `Worker picked up job #${activeJob.job_id.slice(
          0,
          8
        )}. AI frame analysis is now running.`,
      });
    }
    prevSseStatusRef.current = sseStatus;
  }, [sseStatus, activeJob, toast]);

  // Handle Tag Filters
  const handleApplyFilters = useCallback(() => {
    if (!selectedVideo) return;

    const filters: EventTagFilters = {};
    if (playerFilter.trim()) filters.player_id = playerFilter.trim();
    if (eventTypeFilter.trim()) filters.event_type = eventTypeFilter.trim();
    if (selectedCategory !== "all")
      filters.data_point_category = selectedCategory;
    if (verifiedOnlyFilter) filters.verified_only = true;

    const hasFilters = Object.keys(filters).length > 0;
    console.log(filters, "all filterrs");
    loadEventTags(selectedVideo.id, hasFilters ? filters : undefined);
  }, [
    selectedVideo,
    playerFilter,
    eventTypeFilter,
    selectedCategory,
    verifiedOnlyFilter,
    loadEventTags,
  ]);

  const handleClearFilters = useCallback(() => {
    setPlayerFilter("");
    setEventTypeFilter("");
    setSelectedCategory("all");
    setVerifiedOnlyFilter(false);
    if (!selectedVideo) return;

    loadEventTags(selectedVideo.id);
  }, [selectedVideo, loadEventTags]);

  // QA Editing (Protected: Team role only)
  const handleOpenQA = (tag: MatchTag) => {
    if (!isTeamRole) {
      toast({
        title: "Permission Denied",
        description: "Editing match event tags is restricted to team accounts.",
        variant: "destructive",
      });
      return;
    }
    setEditingTag(tag);
    setQaEventType(tag.structured_payload?.event_type || "");
    setQaOutcome(tag.structured_payload?.outcome || "");
  };

  const handleSaveQA = async () => {
    if (!isTeamRole) {
      toast({
        title: "Permission Denied",
        description: "Editing match event tags is restricted to team accounts.",
        variant: "destructive",
      });
      return;
    }
    if (!editingTag || !selectedVideo) return;
    setIsSubmittingQA(true);

    try {
      const updatedPayload = {
        ...(editingTag.structured_payload || {}),
        event_type: qaEventType,
        outcome: qaOutcome,
      };

      await patchEventTagQA(
        editingTag.id,
        {
          corrected_payload: updatedPayload,
          is_verified: true,
        },
        defaultApiBase
      );

      toast({
        title: "QA Correction Saved",
        description: `Tag #${editingTag.id.slice(0, 8)} updated and verified.`,
      });

      await loadEventTags(selectedVideo.id);
      setEditingTag(null);
    } catch (err) {
      toast({
        title: "Save Failed",
        description:
          err instanceof Error ? err.message : "Failed to save QA correction",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingQA(false);
    }
  };

  // Batch Verification (Protected: Team role only)
  const handleVerifyTags = useCallback(async () => {
    if (!isTeamRole) {
      toast({
        title: "Permission Denied",
        description: "Tag verification is restricted to team accounts.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedVideo) return;

    setIsVerifying(true);
    try {
      const result: VerifyTagsResponse = await verifyVideoTags(
        selectedVideo.id,
        defaultApiBase
      );
      setIsTagsVerified(true);
      setVerifiedAt(result.verified_at);

      setProcessedVideos((prev) =>
        prev.map((v) =>
          v.id === selectedVideo.id
            ? { ...v, is_tags_verified: true, verified_at: result.verified_at }
            : v
        )
      );

      toast({
        title: "Tags Verified",
        description: "All event tags for this match are now verified by QA.",
      });
    } catch (err) {
      toast({
        title: "Verification Failed",
        description:
          err instanceof Error ? err.message : "Tag verification failed",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }, [selectedVideo, isTeamRole, defaultApiBase, toast]);

  // Multi-format Export
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!selectedVideo) return;
      setIsExporting(true);

      try {
        await exportMatchTags(selectedVideo.id, format, defaultApiBase);
        toast({
          title: "Export Generated",
          description: `Downloaded match analysis tags in .${format} format.`,
        });
      } catch (err) {
        toast({
          title: "Export Failed",
          description:
            err instanceof Error
              ? err.message
              : "Export failed. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [selectedVideo, defaultApiBase, toast]
  );

  // Filtered Processed Videos Gallery List
  const filteredVideos = useMemo(() => {
    const query = videoSearchQuery.trim().toLowerCase();
    if (!query) return processedVideos;
    return processedVideos.filter((v) => {
      const titleMatch = v.title?.toLowerCase().includes(query);
      const opponentMatch = v.opponent?.toLowerCase().includes(query);
      const compMatch = v.competition?.toLowerCase().includes(query);
      return titleMatch || opponentMatch || compMatch;
    });
  }, [processedVideos, videoSearchQuery]);

  // Filtered Event Tags in Focused View
  const eventTagsList = useMemo(() => {
    const events = timelineData?.timeline?.events || [];
    if (selectedCategory === "all") return events;

    return events.filter((tag) => {
      const cat = (
        tag.data_point_category ||
        tag.structured_payload?.category ||
        ""
      ).toLowerCase();
      const type = (tag.structured_payload?.event_type || "").toLowerCase();
      return cat.includes(selectedCategory) || type.includes(selectedCategory);
    });
  }, [timelineData, selectedCategory]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Video Analysis 3
            </h1>
            <Badge
              variant="outline"
              className={
                isTeamRole
                  ? "bg-primary/10 text-primary border-primary/20 text-xs"
                  : "bg-muted text-muted-foreground border-border text-xs"
              }
            >
              {isTeamRole
                ? "Performance Hub • Team Access"
                : "Read-Only Viewer"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isTeamRole
              ? "Automated match event tagging, video intelligence, and tactical timestamp analysis."
              : "Explore analyzed match footage, tactical event tags, and player performance highlights."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadProcessedVideos();
              if (selectedVideo) loadEventTags(selectedVideo.id);
            }}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live SSE Background Analysis Banner (Only active for Team upload jobs) */}
      {isTeamRole &&
        activeJob &&
        (isQueued || isConnecting || isProcessing) && (
          <Card
            className={`p-4 flex items-center justify-between shadow-sm animate-in fade-in-50 duration-200 ${
              isProcessing
                ? "border-primary/40 bg-primary/5"
                : "border-amber-500/40 bg-amber-500/5"
            }`}
          >
            <div className="flex items-center gap-3">
              {isProcessing ? (
                <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {isProcessing
                      ? "AI Analysis in Progress"
                      : "Video Queued for Analysis"}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      isProcessing
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    Job #{activeJob.job_id.slice(0, 8)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isProcessing
                    ? "Transcoding video and extracting tactical event tags..."
                    : "Video chunks assembled and awaiting analysis worker. Event stream is active..."}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isProcessing
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1.5"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs flex items-center gap-1.5"
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isProcessing
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500 animate-ping"
                }`}
              />
              {isProcessing
                ? "Processing • Live SSE"
                : "Queued • Stream Active"}
            </Badge>
          </Card>
        )}

      {/* =========================================================================
            VIEW 1: FOCUSED VIDEO VIEW (When user clicks a processed video)
           ========================================================================= */}
      {selectedVideo ? (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Focused Header & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseTags}
                className="font-medium text-xs sm:text-sm bg-muted hover:bg-muted/80 text-foreground shrink-0"
                data-testid="button-close-tags"
              >
                <X className="h-4 w-4 mr-1.5 text-muted-foreground" />
                Close Tags
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    {selectedVideo.title}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                  >
                    Processed
                  </Badge>
                  {isTagsVerified && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]"
                    >
                      QA Verified
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {selectedVideo.opponent && (
                    <span>vs {selectedVideo.opponent}</span>
                  )}
                  {selectedVideo.competition && (
                    <span>• {selectedVideo.competition}</span>
                  )}
                  {selectedVideo.match_date && (
                    <span>
                      •{" "}
                      {new Date(selectedVideo.match_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Verification & Multi-format Export */}
            <div className="flex flex-wrap items-center gap-2">
              {isTagsVerified ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Verified
                </Badge>
              ) : isTeamRole ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerifyTags}
                  disabled={isVerifying}
                  className="text-xs"
                >
                  <Shield className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  {isVerifying ? "Verifying..." : "Verify All Tags"}
                </Button>
              ) : null}

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {isExporting ? "Exporting..." : "Export Tags"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">
                    Export Format
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleExport("csv")}
                    className="text-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                    Export as CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("xlsx")}
                    className="text-xs cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-blue-600" />
                    Export as Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("xml")}
                    className="text-xs cursor-pointer"
                  >
                    <FileCode className="h-3.5 w-3.5 mr-2 text-amber-600" />
                    Export as XML (.xml)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge variant="outline" className="text-xs ml-1">
                {timelineData?.timeline?.events?.length || 0} Tags
              </Badge>
            </div>
          </div>

          {/* Split Layout: Video Player + Event Tags Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Dedicated Video Player */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <Card className="overflow-hidden border-border/60 bg-black/95 shadow-md">
                <div className="relative aspect-video flex items-center justify-center bg-black">
                  {isR2Key ? (
                    <SignedVideoPlayer
                      controls
                      autoPlay
                      playsInline
                      onTimeUpdate={handleVideoTimeUpdate}
                      ref={videoPlayerRef}
                      onLoadedMetadata={(e) => {
                        console.log("metadata loaded");
                        console.log("videoWidth", e.currentTarget.width);
                        console.log("videoHeight", e.currentTarget.height);
                        if (videoPlayerRef.current) {
                          setVideoDuration(videoPlayerRef.current.duration);
                        }
                      }}
                      onCanPlay={() => console.log("can play")}
                      onError={(e) => {
                        console.log("VIDEO ERROR", e.currentTarget.error);
                      }}
                      isAnalysisVid={true}
                      className="w-full h-full rounded-md"
                      videoKey={selectedVideo.file_url}
                      data-testid="video-player"
                    >
                      Your browser does not support the video tag.
                    </SignedVideoPlayer> // <video
                  ) : (
                    //   ref={videoPlayerRef}
                    //   src={activeVideoSource}
                    //   className="w-full h-full object-contain"
                    //   controls
                    //   onTimeUpdate={handleVideoTimeUpdate}
                    //   onLoadedMetadata={() => {
                    //     if (videoPlayerRef.current) {
                    //       setVideoDuration(videoPlayerRef.current.duration);
                    //     }
                    //   }}
                    // />
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <VideoIcon className="h-12 w-12 mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-medium">
                        Video stream source not available
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        The video file is processing or waiting for cloud
                        storage synchronization.
                      </p>
                    </div>
                  )}
                </div>

                {/* Player Footer & Scrub Hint */}
                <CardFooter className="bg-card border-t border-border/40 px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>
                      Current:{" "}
                      <strong className="text-foreground">
                        {formatSecondsToTimestamp(currentVideoTime)}
                      </strong>
                    </span>
                    {videoDuration > 0 && (
                      <span>/ {formatSecondsToTimestamp(videoDuration)}</span>
                    )}
                  </div>

                  {selectedTagId && (
                    <Badge
                      variant="outline"
                      className="text-[11px] bg-primary/10 text-primary border-primary/20"
                    >
                      ▶ Active Moment:{" "}
                      {timelineData?.timeline?.events
                        ?.find((t) => t.id === selectedTagId)
                        ?.structured_payload?.event_type?.toUpperCase() ||
                        "Selected Moment"}
                    </Badge>
                  )}
                </CardFooter>
              </Card>

              {/* Event Timeline Visualization Map */}
              {timelineData?.timeline?.events &&
                timelineData.timeline.events.length > 0 &&
                videoDuration > 0 && (
                  <Card className="p-4 border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Match Event Timeline Map
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Click markers to seek video
                      </span>
                    </div>

                    <div className="relative h-6 bg-muted/60 rounded-md overflow-hidden cursor-pointer">
                      {/* Playback progress fill */}
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-primary/20 transition-all pointer-events-none"
                        style={{
                          width: `${(currentVideoTime / videoDuration) * 100}%`,
                        }}
                      />
                      {/* Current time playhead */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                        style={{
                          left: `${(currentVideoTime / videoDuration) * 100}%`,
                        }}
                      />

                      {/* Tag markers on timeline */}
                      {timelineData.timeline.events.map((tag) => {
                        const tagSeconds = tag.match_time_sec ?? 0;
                        const positionPercent = Math.min(
                          100,
                          Math.max(0, (tagSeconds / videoDuration) * 100)
                        );
                        const isCurrentActive = tag.id === selectedTagId;

                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagClick(tag)}
                            title={`${
                              tag.timestamp_str ||
                              formatSecondsToTimestamp(tagSeconds)
                            } - ${tag.natural_language_output}`}
                            className={`absolute top-1 bottom-1 w-1.5 -ml-0.5 rounded-full transition-all ${
                              isCurrentActive
                                ? "bg-amber-400 ring-2 ring-amber-300 z-20 scale-125"
                                : tag.data_point_category === "attacking_play"
                                ? "bg-emerald-500 hover:bg-emerald-400"
                                : tag.data_point_category === "defensive_action"
                                ? "bg-blue-500 hover:bg-blue-400"
                                : tag.data_point_category === "set_piece"
                                ? "bg-purple-500 hover:bg-purple-400"
                                : "bg-primary/80 hover:bg-primary"
                            }`}
                            style={{ left: `${positionPercent}%` }}
                          />
                        );
                      })}
                    </div>
                  </Card>
                )}
            </div>

            {/* Right Column: Event Tags Feed */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <Card className="border-border/60 shadow-sm flex flex-col h-[580px]">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-semibold">
                        Video Event Tags
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {eventTagsList.length}{" "}
                      {eventTagsList.length === 1 ? "Tag" : "Tags"}
                    </Badge>
                  </div>

                  {/* Filter Category Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-1 scrollbar-none">
                    {(
                      [
                        "all",
                        "attacking",
                        "defensive",
                        "pass",
                        "set_pieces",
                        "pressing_triggers",
                        "line_breaking_runs",
                        "discipline",
                      ] as const
                    ).map((cat) => (
                      <Button
                        key={cat}
                        variant={
                          selectedCategory === cat ? "secondary" : "ghost"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={`h-7 px-2.5 text-xs capitalize ${
                          selectedCategory === cat
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>

                  {/* Filter Toggle */}
                  <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAdvancedFilters(!showAdvancedFilters)
                      }
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      {showAdvancedFilters
                        ? "Hide Search Filters"
                        : "Filter by Player / Type"}
                    </button>

                    {(playerFilter ||
                      eventTypeFilter ||
                      verifiedOnlyFilter) && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-muted-foreground hover:text-foreground underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Collapsible Filter Inputs */}
                  {showAdvancedFilters && (
                    <div className="pt-2 space-y-2 text-xs border-t border-border/30 mt-2">
                      <Input
                        placeholder="Filter player (e.g. jersey_10)"
                        value={playerFilter}
                        onChange={(e) => setPlayerFilter(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="Event type (shot, pass, tackle)"
                        value={eventTypeFilter}
                        onChange={(e) => setEventTypeFilter(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={verifiedOnlyFilter}
                            onCheckedChange={(checked) =>
                              setVerifiedOnlyFilter(Boolean(checked))
                            }
                          />
                          <span>Verified only</span>
                        </label>
                        <Button
                          size="sm"
                          onClick={handleApplyFilters}
                          className="h-6 text-xs px-2.5"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden">
                  {isLoadingTags ? (
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-16 w-full rounded-md" />
                      <Skeleton className="h-16 w-full rounded-md" />
                      <Skeleton className="h-16 w-full rounded-md" />
                      <Skeleton className="h-16 w-full rounded-md" />
                    </div>
                  ) : tagsError ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-xs font-semibold text-foreground">
                        {tagsError}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadEventTags(selectedVideo.id)}
                        className="mt-3 text-xs"
                      >
                        Retry Retrieval
                      </Button>
                    </div>
                  ) : eventTagsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                      <Tag className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm font-medium text-foreground">
                        No Event Tags Found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedCategory !== "all" ||
                        playerFilter ||
                        eventTypeFilter
                          ? "No tags matched current filter criteria."
                          : "Event tags are being processed or awaiting microservice indexing."}
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-full p-3">
                      <div className="space-y-2.5">
                        {eventTagsList.map((tag, idx) => {
                          const eventType =
                            tag.structured_payload?.event_type || "Moment";
                          const isTagActive = selectedTagId === tag.id;
                          const badgeColor = getTagCategoryColor(
                            tag.data_point_category,
                            eventType
                          );

                          return (
                            <div
                              key={tag.id || `tag-${idx}`}
                              onClick={() => handleTagClick(tag)}
                              role="button"
                              tabIndex={0}
                              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                isTagActive
                                  ? "bg-primary/10 border-primary shadow-sm"
                                  : "bg-card hover:bg-muted/50 border-border/50 hover:border-border"
                              }`}
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}
                                  >
                                    {eventType}
                                  </Badge>

                                  <span className="text-xs font-mono font-bold text-foreground">
                                    {tag.timestamp_str ||
                                      tag.timestamp ||
                                      formatSecondsToTimestamp(
                                        tag.match_time_sec ?? 0
                                      )}
                                  </span>

                                  {tag.is_verified && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0"
                                    >
                                      QA Verified
                                    </Badge>
                                  )}

                                  {tag.model_confidence_score !== undefined && (
                                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                                      {Math.round(
                                        (tag.model_confidence_score ?? 1) * 100
                                      )}
                                      %
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                                  {tag.natural_language_output}
                                </p>

                                {/* Structured Chips */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {tag.player_id && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                                      <User className="h-2.5 w-2.5" />
                                      {tag.player_id}
                                    </span>
                                  )}
                                  {tag.structured_payload?.pitch_zone && (
                                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                                      Zone: {tag.structured_payload.pitch_zone}
                                    </span>
                                  )}
                                  {tag.structured_payload?.outcome && (
                                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                                      {tag.structured_payload.outcome}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 rounded-full ${
                                    isTagActive
                                      ? "text-primary bg-primary/20"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <Play className="h-3 w-3 fill-current" />
                                </Button>

                                {isTeamRole && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenQA(tag);
                                    }}
                                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                                  >
                                    <Edit2 className="h-2.5 w-2.5 mr-1" />
                                    QA
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>

                <CardFooter className="border-t border-border/40 p-3 bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseTags}
                    className="w-full text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Close Tags (Back to All Videos)
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
              VIEW 2: MAIN PAGE (Side VideoUploader + Returned Processed Videos)
           ========================================================================= */
        <div
          className={
            isTeamRole
              ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              : "w-full space-y-6"
          }
        >
          {/* SIDEBAR: Upload New Video for Analysis (VideoUploader) — Only visible to Team role */}
          {isTeamRole && (
            <aside className="lg:col-span-4 w-full">
              <VideoUploader
                apiBaseUrl={defaultApiBase}
                currentJobStatus={sseStatus}
                onUploadComplete={(job) => {
                  setActiveJob(job);
                  // loadProcessedVideos();
                  toast({
                    title: "Upload Successful",
                    description: `Video assembled. Analysis job #${job.job_id.slice(
                      0,
                      8
                    )} is queued.`,
                  });
                }}
                onJobReset={() => setActiveJob(null)}
              />
            </aside>
          )}

          {/* MAIN CONTENT AREA: Processed Videos Gallery */}
          <main
            className={
              isTeamRole ? "lg:col-span-8 space-y-6" : "w-full space-y-6"
            }
          >
            {/* Gallery Controls Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Processed Videos
                </h2>
                <Badge variant="secondary" className="text-xs font-medium">
                  {processedVideos.length}{" "}
                  {processedVideos.length === 1 ? "Video" : "Videos"}
                </Badge>
                {!isTeamRole && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground border-border/60"
                  >
                    Viewer Access
                  </Badge>
                )}
              </div>

              {/* Search Filter Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search processed videos..."
                  value={videoSearchQuery}
                  onChange={(e) => setVideoSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
                {videoSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setVideoSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* State 1: Loading Skeleton */}
            {isLoadingVideos ? (
              <div
                className={
                  isTeamRole
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                }
              >
                {[1, 2, 3, 4, 5, 6].slice(0, isTeamRole ? 4 : 6).map((i) => (
                  <Card key={i} className="overflow-hidden border-border/60">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : videosError ? (
              /* State 2: Error Message */
              <Card className="p-8 border-destructive/30 bg-destructive/5 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  Error Loading Processed Videos
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {videosError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadProcessedVideos}
                  className="mt-4 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
              </Card>
            ) : processedVideos.length === 0 ? (
              /* State 3: VERY CLEAR EMPTY STATE MESSAGE (Prompt Requirement) */
              <Card className="border-dashed border-2 border-border/80 bg-card/60 p-12 text-center shadow-none">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/80 mb-4">
                  <Film className="h-8 w-8 text-muted-foreground/70" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  No Analyzed Videos Found
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                  There are currently no processed videos in the system (where{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary">
                    video.processed = true
                  </code>
                  ).
                </p>
                <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
                  {isTeamRole ? (
                    <>
                      To start analyzing footage, use the{" "}
                      <strong>Upload for Analysis</strong> form on the left to
                      submit match clips with 10MB chunking.
                    </>
                  ) : (
                    <>
                      Processed match footage and AI event tags will appear here
                      once analyzed and published by team analysts.
                    </>
                  )}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadProcessedVideos}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Check for New Videos
                  </Button>
                </div>
              </Card>
            ) : filteredVideos.length === 0 ? (
              /* State 4: Search filter empty state */
              <div className="p-8 text-center border rounded-lg bg-card/50">
                <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  No videos matching "{videoSearchQuery}"
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVideoSearchQuery("")}
                  className="mt-2 text-xs text-primary"
                >
                  Clear search query
                </Button>
              </div>
            ) : (
              /* State 5: Grid of Processed Videos */
              <div
                className={
                  isTeamRole
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                }
              >
                {filteredVideos.map((video) => (
                  <Card
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    role="button"
                    tabIndex={0}
                    className="group cursor-pointer overflow-hidden border-border/60 hover:border-primary/50 transition-all duration-200 hover:shadow-md bg-card flex flex-col justify-between"
                  >
                    <div>
                      {/* Video Thumbnail / Preview Area */}
                      <div className="relative aspect-video bg-muted/80 flex items-center justify-center overflow-hidden">
                        {video.thumbnail_url || video.thumbnailUrl ? (
                          <img
                            src={video.thumbnail_url || video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <VideoIcon className="h-10 w-10 mb-1 opacity-40 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px]">Match Footage</span>
                          </div>
                        )}

                        {/* Hover Play Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Processed Badge */}
                        <div className="absolute top-2.5 left-2.5">
                          <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-[10px] font-semibold border-none shadow-sm backdrop-blur-sm">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Processed
                          </Badge>
                        </div>

                        {/* QA Verified Badge */}
                        {video.is_tags_verified && (
                          <div className="absolute top-2.5 right-2.5">
                            <Badge className="bg-purple-600/90 text-white text-[10px] font-semibold border-none shadow-sm">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                              QA Verified
                            </Badge>
                          </div>
                        )}

                        {/* Duration Badge */}
                        {video.duration && (
                          <div className="absolute bottom-2.5 right-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                              {video.duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="p-4 space-y-1.5">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {video.opponent && <span>vs {video.opponent}</span>}
                          {video.competition && (
                            <span>• {video.competition}</span>
                          )}
                          {video.match_date && (
                            <span>
                              •{" "}
                              {new Date(video.match_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardFooter className="px-4 py-2.5 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-primary font-medium">
                      <span className="flex items-center gap-1 group-hover:underline">
                        View Analysis & Event Tags
                      </span>
                      <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* QA Edit Dialog (Protected: Team role only) */}
      {isTeamRole && (
        <Dialog
          open={!!editingTag}
          onOpenChange={(open) => !open && setEditingTag(null)}
        >
          <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Edit Event Tag (QA Correction)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update event classification or recorded outcome. This updates
                the QA pipeline and invalidates cached tags.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 w-full min-w-0">
              <div className="space-y-1 w-full min-w-0">
                <Label htmlFor="qa-event-type" className="text-xs font-medium">
                  Event Type
                </Label>
                <Input
                  id="qa-event-type"
                  value={qaEventType}
                  onChange={(e) => setQaEventType(e.target.value)}
                  placeholder="e.g. shot, pass, tackle"
                  className="h-9 text-xs w-full"
                />
              </div>

              <div className="space-y-1 w-full min-w-0">
                <Label htmlFor="qa-outcome" className="text-xs font-medium">
                  Outcome
                </Label>
                <Input
                  id="qa-outcome"
                  value={qaOutcome}
                  onChange={(e) => setQaOutcome(e.target.value)}
                  placeholder="e.g. successful, off-target, blocked"
                  className="h-9 text-xs w-full"
                />
              </div>

              {editingTag && (
                <div className="p-3 rounded-lg bg-muted/60 border border-border/40 text-xs space-y-1.5 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-primary shrink-0" />
                    <span>Timestamp:</span>
                    <span className="font-semibold text-foreground">
                      {editingTag.timestamp_str ||
                        formatSecondsToTimestamp(
                          editingTag.match_time_sec ?? 0
                        )}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/90 break-words whitespace-normal leading-relaxed">
                    <span className="text-muted-foreground font-medium">
                      Narrative:{" "}
                    </span>
                    {editingTag.natural_language_output}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="w-full flex flex-row items-center justify-end gap-2 pt-3 border-t border-border/40 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingTag(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveQA}
                disabled={isSubmittingQA}
                className="text-xs font-semibold"
              >
                {isSubmittingQA ? "Saving..." : "Save QA Correction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/**
 * Returns Tailwind color classes corresponding to an event tag category.
 */
function getTagCategoryColor(category?: string, eventType?: string): string {
  const norm = `${category || ""} ${eventType || ""}`.toLowerCase();
  if (
    norm.includes("attacking") ||
    norm.includes("shot") ||
    norm.includes("goal") ||
    norm.includes("chance")
  ) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (
    norm.includes("defending") ||
    norm.includes("defensive") ||
    norm.includes("tackle") ||
    norm.includes("interception") ||
    norm.includes("clearance")
  ) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }
  if (
    norm.includes("passing") ||
    norm.includes("pass") ||
    norm.includes("cross") ||
    norm.includes("buildup")
  ) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  }
  if (
    norm.includes("tactical") ||
    norm.includes("press") ||
    norm.includes("formation") ||
    norm.includes("transition")
  ) {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
  }
  if (
    norm.includes("foul") ||
    norm.includes("card") ||
    norm.includes("discipline")
  ) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  }
  return "bg-muted text-muted-foreground";
}
