import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  Video,
  FileText,
  Users,
  Calendar,
  Trophy,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  FileVideo,
  Clock,
  HardDrive,
  Zap,
  Target,
  Camera,
  PlayCircle,
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSportData } from '@/hooks/useSportData';
import { LeagueSelect } from '@/components/ui/LeagueSelect';
import EnhancedVideoCompressionService from '@/domains/video/services/enhancedVideoCompressionService';
import { gpuVideoCompressionService, type GPUCompressionResult } from '@/domains/video/services/gpuAcceleratedVideoCompressionService';
import { fastVideoCompressionService, type FastCompressionResult } from '@/domains/video/services/fastVideoCompressionServiceV2';
import { ultraFastVideoCompressionService, type UltraFastResult } from '@/domains/video/services/ultraFastVideoCompressionService';
import { streamingVideoCompressionService, type StreamingResult } from '@/domains/video/services/streamingVideoCompressionService';
import { instantVideoCompressionService, type InstantResult } from '@/domains/video/services/instantVideoCompressionService';
import { highQualityVideoCompressionService, type HighQualityResult } from '@/domains/video/services/highQualityVideoCompressionService';
import { robustVideoCompressionService, type RobustResult } from '@/domains/video/services/robustVideoCompressionService';
import { blazingFastVideoCompressionService, type BlazingFastResult } from '@/domains/video/services/blazingFastVideoCompressionService';
import { balancedVideoCompressionService, type BalancedResult } from '@/domains/video/services/balancedVideoCompressionService';
import { serverSideCompressionService, type ServerCompressionResult } from '@/domains/video/services/serverSideCompressionService';
import { improvedVideoCompressionService, type ImprovedCompressionOptions, type ImprovedCompressionResult } from '@/domains/video/services/improvedVideoCompressionService';
import { webmOptimizedCompressionService, type WebMOptimizedOptions, type WebMOptimizedResult } from '@/domains/video/services/webmOptimizedCompressionService';
import { formatPreservingCompressionService, type FormatPreservingOptions, type FormatPreservingResult } from '@/domains/video/services/formatPreservingCompressionService';
import { simpleFallbackCompressionService, type SimpleFallbackResult } from '@/domains/video/services/simpleFallbackCompressionService';
import { performanceMonitor } from '@/domains/video/services/videoCompressionPerformanceMonitor';
import { presignedUploadService } from '@/domains/video/services/presignedUploadService';

interface VideoMetadata {
  title: string;
  description: string;
  videoType: 'match' | 'training' | 'interview' | 'highlight';
  playerTags: string[];
  matchDetails?: {
    opposingTeam: string;
    matchDate: string;
    league: string;
    homeOrAway: 'home' | 'away';
    homeScore: string;
    awayScore: string;
    venue: string;
  };
}

interface TeamPlayer {
  id: string;
  full_name: string;
  position: string;
  jersey_number?: number;
}

interface CompressionSettings {
  quality: 'premium' | 'high' | 'balanced' | 'fast';
  preserveAudio: boolean;
  maintainSmoothPlayback: boolean;
}

interface ProcessingStatus {
  stage: 'idle' | 'compressing' | 'uploading' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface VideoFileInfo {
  name: string;
  size: number;
  type: string;
  duration?: number;
  dimensions?: { width: number; height: number };
}

interface VideoUploadItem {
  id: string;
  file: File;
  fileInfo: VideoFileInfo & { thumbnailUrl?: string };
  previewUrl: string;
  metadata: VideoMetadata;
  processingStatus: ProcessingStatus;
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
  isExpanded: boolean;
  uploadedVideoId?: string;
}

interface EnhancedVideoUploadFormProps {
  teamId: string;
  onUploadComplete?: (videoId: string) => void;
  onCancel?: () => void;
}

const MAX_VIDEOS = 6;
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB - prevents memory issues during compression

const EnhancedVideoUploadForm: React.FC<EnhancedVideoUploadFormProps> = ({
  teamId,
  onUploadComplete,
  onCancel
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const [videoItems, setVideoItems] = useState<VideoUploadItem[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [teamSportType, setTeamSportType] = useState<string>('football');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());

  // Get sport-specific data for leagues
  const sportData = useSportData(teamSportType, 'male');

  const videoCompressionService = new EnhancedVideoCompressionService();

  useEffect(() => {
    fetchTeamPlayers();
  }, [teamId]);

  useEffect(() => {
    return () => {
      // Clean up all blob URLs
      blobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  const fetchTeamPlayers = async () => {
    if (!teamId) return;

    try {
      // Fetch team data to get sport type
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('sport_type')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      if (teamData?.sport_type) {
        setTeamSportType(teamData.sport_type);
      }

      // Fetch team players
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number')
        .eq('team_id', teamId)
        .order('full_name');

      if (error) throw error;
      setTeamPlayers(data || []);
    } catch (error) {
      console.error('Error fetching team players:', error);
      toast({
        title: "Error",
        description: "Failed to load team players",
        variant: "destructive"
      });
    }
  };

  const getVideoFileInfo = async (file: File, previewUrl: string): Promise<VideoFileInfo & { thumbnailUrl?: string }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      video.src = previewUrl;

      const generateThumbnail = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set canvas size to video dimensions
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          if (ctx) {
            // Draw the current video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              duration: video.duration,
              dimensions: {
                width: video.videoWidth,
                height: video.videoHeight
              },
              thumbnailUrl
            });
          } else {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              duration: video.duration,
              dimensions: {
                width: video.videoWidth,
                height: video.videoHeight
              }
            });
          }
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            duration: video.duration,
            dimensions: {
              width: video.videoWidth,
              height: video.videoHeight
            }
          });
        }
      };

      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of duration, whichever is smaller
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        // Video frame is ready, generate thumbnail
        generateThumbnail();
      };

      video.onerror = () => {
        console.error('Error loading video for thumbnail generation');
        resolve({
          name: file.name,
          size: file.size,
          type: file.type
        });
      };
    });
  };

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid video file",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(1);
      toast({
        title: "File Too Large",
        description: `Video file is ${fileSizeGB}GB. Maximum allowed size is 2GB to prevent compression issues. Please compress your video first or choose a smaller file.`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (files: FileList) => {
    const newFiles = Array.from(files).slice(0, MAX_VIDEOS - videoItems.length);

    for (const file of newFiles) {
      if (!validateFile(file)) continue;

      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add to loading state
      setLoadingVideos(prev => new Set(prev).add(videoId));

      try {
        // Create blob URL first
        const previewUrl = URL.createObjectURL(file);
        blobUrlsRef.current.add(previewUrl); // Track the blob URL

        // Get file info and thumbnail using the same blob URL
        const fileInfo = await getVideoFileInfo(file, previewUrl);

        const newVideoItem: VideoUploadItem = {
          id: videoId,
          file,
          fileInfo,
          previewUrl,
          metadata: {
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: '',
            videoType: 'match',
            playerTags: [],
            matchDetails: {
              opposingTeam: '',
              matchDate: '',
              league: '',
              homeOrAway: 'home',
              homeScore: '',
              awayScore: '',
              venue: ''
            }
          },
          processingStatus: {
            stage: 'idle',
            progress: 0,
            message: ''
          },
          isExpanded: false
        };

        setVideoItems(prev => [...prev, newVideoItem]);
      } catch (error) {
        console.error('Error processing video file:', error);
        toast({
          title: "Error Processing Video",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        });
      } finally {
        // Remove from loading state
        setLoadingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      }
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const removeVideoItem = (id: string) => {
    setVideoItems(prev => {
      const item = prev.find(v => v.id === id);
      if (item) {
        // Revoke the blob URL
        URL.revokeObjectURL(item.previewUrl);
        blobUrlsRef.current.delete(item.previewUrl);
      }
      return prev.filter(v => v.id !== id);
    });
  };

  const toggleVideoExpanded = (id: string) => {
    setVideoItems(prev => prev.map(v =>
      v.id === id ? { ...v, isExpanded: !v.isExpanded } : v
    ));
  };

  const updateVideoMetadata = (id: string, updates: Partial<VideoMetadata>) => {
    setVideoItems(prev => prev.map(v =>
      v.id === id ? { ...v, metadata: { ...v.metadata, ...updates } } : v
    ));
  };

  const updateProcessingStatus = (id: string, stage: ProcessingStatus['stage'], progress: number, message: string) => {
    setVideoItems(prev => prev.map(v =>
      v.id === id ? { ...v, processingStatus: { stage, progress, message } } : v
    ));
  };

  const setUploadedVideoId = (id: string, videoId: string) => {
    setVideoItems(prev => prev.map(v =>
      v.id === id ? { ...v, uploadedVideoId: videoId } : v
    ));
  };

  // Utility function to sanitize filenames for storage
  const sanitizeFileName = (name: string): string => {
    return name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  const uploadSingleVideo = async (videoItem: VideoUploadItem): Promise<string | null> => {
    const { id, file, metadata } = videoItem;

    try {
      // Step 1: GPU-Accelerated Video Compression (10x faster!)
      updateProcessingStatus(id, 'compressing', 30, '🚀 GPU-accelerated compression...');

      // Start performance monitoring
      performanceMonitor.startPerformanceMark(`compression-${id}`);

      let compressionResult: (GPUCompressionResult | FastCompressionResult | UltraFastResult | StreamingResult | InstantResult | HighQualityResult | RobustResult | BlazingFastResult | BalancedResult | ImprovedCompressionResult | WebMOptimizedResult | FormatPreservingResult | SimpleFallbackResult | ServerCompressionResult) & { thumbnailBlob?: Blob };
      const fileSizeMB = file.size / (1024 * 1024);
      let compressedFile: File;

      // Default high-quality compression settings
      const compressionSettings: CompressionSettings = {
        quality: 'balanced', // Good balance of quality and speed
        preserveAudio: true, // Always preserve audio
        maintainSmoothPlayback: true // Ensure smooth playback
      };

      try {
        // Use FORMAT-PRESERVING compression to maintain original video format
        const originalFormat = file.type;
        console.log(`🎬 Using FORMAT-PRESERVING compression for ${fileSizeMB.toFixed(2)}MB ${originalFormat} file`);

        // Choose mode based on file size for optimal quality/speed balance
        let compressionMode: 'quality' | 'balanced' | 'speed';

        if (fileSizeMB <= 10) {
          compressionMode = 'quality'; // High quality for small files
        } else if (fileSizeMB <= 50) {
          compressionMode = 'balanced'; // Balanced for medium files
        } else if (fileSizeMB <= 100) {
          compressionMode = 'balanced'; // Balanced for large files
        } else {
          compressionMode = 'speed'; // Fast for very large files
        }

        // Use server-side compression for better quality and consistency
        console.log(`🚀 Using SERVER-SIDE compression for ${fileSizeMB.toFixed(2)}MB file`);

        compressionResult = await serverSideCompressionService.compressVideo(file, {
          compressionQuality: fileSizeMB > 100 ? 'medium' : fileSizeMB > 50 ? 'high' : 'high',
          targetBitrate: fileSizeMB > 100 ? 1500 : fileSizeMB > 50 ? 2000 : 2500,
          maxResolution: fileSizeMB > 100 ? '720p' : '1080p',
          onProgress: (progress) => {
            updateProcessingStatus(id, 'compressing', 30 + (progress * 0.4),
              `🎬 SERVER-SIDE FFmpeg compression: ${Math.round(progress)}%`);
          },
          onStatusChange: (status) => {
            updateProcessingStatus(id, 'compressing', 30,
              `🎬 ${status}`);
          }
        });

        // Set compressed file for upload
        compressedFile = 'compressedFile' in compressionResult ? (compressionResult as any).compressedFile : (compressionResult as any).originalFile;

      } catch (error) {
        console.error('High-quality compression failed, trying robust fallback:', error);

        try {
          // Fallback to robust compression for maximum compatibility
          console.log(`🛡️ Falling back to robust compression for compatibility`);
          compressionResult = await robustVideoCompressionService.compressVideo(file, {
            targetSizeMB: 15,
            quality: 'balanced',
            preserveAudio: false, // Disable audio for maximum compatibility
            onProgress: (progress) => {
              updateProcessingStatus(id, 'compressing', 30 + (progress * 0.4),
                `🛡️ ROBUST fallback compression: ${Math.round(progress)}%`);
            }
          });

          // Set compressed file for upload
          compressedFile = 'compressedFile' in compressionResult ? (compressionResult as any).compressedFile : (compressionResult as any).originalFile;
        } catch (robustError) {
          console.error('Robust compression also failed, trying simple fallback:', robustError);
          try {
            // Ultimate fallback: simple compression with minimal constraints
            console.log(`🛡️ Using SIMPLE FALLBACK compression - maximum compatibility`);
            compressionResult = await simpleFallbackCompressionService.compressVideo(file);

            // Set compressed file for upload
            compressedFile = 'compressedFile' in compressionResult ? (compressionResult as any).compressedFile : (compressionResult as any).originalFile;
          } catch (simpleError) {
            console.error('All compression methods failed:', simpleError);
            throw new Error('All compression methods failed. Please try a smaller video file or different format.');
          }
        }
      }

      // End performance monitoring and record benchmark
      const processingTime = performanceMonitor.endPerformanceMark(`compression-${id}`);

      // Record performance benchmark
      const fileForBenchmark = 'compressedFile' in compressionResult ? compressionResult.compressedFile : compressionResult.originalFile;
      const qualityScore = await performanceMonitor.assessQuality(file, fileForBenchmark);
      performanceMonitor.recordBenchmark({
        method: compressionResult.method as any,
        originalSizeMB: compressionResult.originalSizeMB,
        compressedSizeMB: compressionResult.compressedSizeMB,
        compressionRatio: compressionResult.compressionRatio,
        processingTimeMs: compressionResult.processingTimeMs,
        fps: 30,
        qualityScore
      });

      // Update compression stats with GPU performance data
      setVideoItems(prev => prev.map(v =>
        v.id === id ? {
          ...v,
          compressionStats: {
            originalSize: file.size,
            compressedSize: compressionResult.compressedSizeMB * 1024 * 1024,
            ratio: Math.round((1 - (compressionResult.compressedSizeMB * 1024 * 1024) / file.size) * 100),
            method: compressionResult.method,
            processingTime: compressionResult.processingTimeMs,
            speedImprovement: '10x+ faster'
          }
        } : v
      ));

      // Step 2: Upload to Cloudflare R2 using presigned URLs
      updateProcessingStatus(id, 'uploading', 70, 'Uploading...');

      const uploadResult = await presignedUploadService.uploadVideo(
        compressedFile,
        metadata.title,
        teamId,
        (progress) => {
          updateProcessingStatus(id, 'uploading', 70 + (progress * 0.2),
            `Uploading: ${Math.round(progress)}%`);
        }
      );

      if (!uploadResult.success || !uploadResult.key) {
        throw new Error(uploadResult.error || 'Failed to upload video to R2');
      }

      // Store the R2 key instead of public URL for private bucket
      const videoKey = uploadResult.key;

      // Step 3: Upload thumbnail if available
      let thumbnailUrl = null;
      if (compressionResult.thumbnailBlob) {
        updateProcessingStatus(id, 'uploading', 90, 'Uploading...');

        const thumbnailResult = await presignedUploadService.uploadThumbnail(
          compressionResult.thumbnailBlob,
          metadata.title,
          teamId,
          (progress) => {
            updateProcessingStatus(id, 'uploading', 90 + (progress * 0.1),
              `Uploading thumbnail: ${Math.round(progress)}%`);
          }
        );

        if (thumbnailResult.success && thumbnailResult.key) {
          // Store the thumbnail key instead of public URL
          thumbnailUrl = thumbnailResult.key;
        }
      }

      // Step 5: Save to database
      updateProcessingStatus(id, 'uploading', 90, 'Saving video metadata...');

      // Format score for database (combine home and away scores)
      const formattedScore = metadata.matchDetails?.homeScore && metadata.matchDetails?.awayScore
        ? `${metadata.matchDetails.homeScore}-${metadata.matchDetails.awayScore}`
        : null;

      // Safely parse scores to integers
      const homeScore = metadata.matchDetails?.homeScore ?
        parseInt(metadata.matchDetails.homeScore, 10) : null;
      const awayScore = metadata.matchDetails?.awayScore ?
        parseInt(metadata.matchDetails.awayScore, 10) : null;

      // Validate that parsed scores are valid numbers
      const validHomeScore = homeScore && !isNaN(homeScore) ? homeScore : null;
      const validAwayScore = awayScore && !isNaN(awayScore) ? awayScore : null;

      // Validate date fields - convert empty strings to null
      const validMatchDate = metadata.matchDetails?.matchDate && metadata.matchDetails.matchDate.trim() !== ''
        ? metadata.matchDetails.matchDate
        : null;

      // Validate other optional string fields
      const validOpposingTeam = metadata.matchDetails?.opposingTeam && metadata.matchDetails.opposingTeam.trim() !== ''
        ? metadata.matchDetails.opposingTeam
        : null;

      const validHomeOrAway = metadata.matchDetails?.homeOrAway && metadata.matchDetails.homeOrAway.trim() !== ''
        ? metadata.matchDetails.homeOrAway
        : null;

      const validDescription = metadata.description && metadata.description.trim() !== ''
        ? metadata.description
        : null;

      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          team_id: teamId,
          title: metadata.title || 'Untitled Video', // Ensure title is never empty
          description: validDescription,
          video_url: videoKey, // Store R2 key instead of public URL
          thumbnail_url: thumbnailUrl, // Store R2 key instead of public URL
          video_type: metadata.videoType,
          tagged_players: metadata.playerTags, // Use 'tagged_players' (JSONB column)
          opposing_team: validOpposingTeam,
          match_date: validMatchDate,
          score: formattedScore, // Combined score for display
          final_score_home: validHomeScore,
          final_score_away: validAwayScore,
          home_or_away: validHomeOrAway,
          file_size: compressionResult.compressedSizeMB * 1024 * 1024,
          duration: Math.round(videoItem.fileInfo.duration || 0), // Convert decimal seconds to integer, default to 0 if undefined
          is_public: true
        })
        .select()
        .single();

      if (dbError) throw dbError;

      updateProcessingStatus(id, 'complete', 100, 'Upload complete!');
      setUploadedVideoId(id, videoData.id);

      return videoData.id;

    } catch (error) {
      console.error('Error uploading video:', error);
      updateProcessingStatus(id, 'error', 0, `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const retryVideoUpload = async (videoId: string) => {
    const videoItem = videoItems.find(item => item.id === videoId);
    if (!videoItem) return;

    // Reset the processing status
    updateProcessingStatus(videoId, 'idle', 0, 'Ready to retry');

    // Wait a moment then start upload
    setTimeout(async () => {
      await uploadSingleVideo(videoItem);
    }, 500);
  };

  const handleUploadAll = async () => {
    if (videoItems.length === 0) {
      toast({
        title: "No Videos Selected",
        description: "Please select at least one video to upload",
        variant: "destructive"
      });
      return;
    }

    // Validate all videos before upload
    const validation = validateAllVideos();
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).flat();
      toast({
        title: "Validation Error",
        description: `Please complete all required fields: ${errorMessages.slice(0, 3).join(', ')}${errorMessages.length > 3 ? '...' : ''}`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setOverallProgress(0);

    const uploadedVideoIds: string[] = [];

    try {
      for (let i = 0; i < videoItems.length; i++) {
        const videoItem = videoItems[i];
        setOverallProgress((i / videoItems.length) * 100);

        const videoId = await uploadSingleVideo(videoItem);
        if (videoId) {
          uploadedVideoIds.push(videoId);
        }

        // Small delay between uploads to prevent overwhelming the server
        if (i < videoItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setOverallProgress(100);

      if (uploadedVideoIds.length > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${uploadedVideoIds.length} video(s)`,
        });

        // Clean up all blob URLs after successful upload
        blobUrlsRef.current.forEach(url => {
          URL.revokeObjectURL(url);
        });
        blobUrlsRef.current.clear();

        if (onUploadComplete) {
          onUploadComplete(uploadedVideoIds[0]); // Return first video ID for compatibility
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "No videos were successfully uploaded",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error in batch upload:', error);
      toast({
        title: "Upload Error",
        description: "An error occurred during the upload process",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateVideoItem = (videoItem: VideoUploadItem): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check required fields
    if (!videoItem.metadata.title.trim()) {
      errors.push('Title is required');
    }

    if (!videoItem.metadata.description.trim()) {
      errors.push('Description is required');
    }

    // Check match details if video type is match
    if (videoItem.metadata.videoType === 'match') {
      const matchDetails = videoItem.metadata.matchDetails;
      if (!matchDetails?.opposingTeam.trim()) {
        errors.push('Opposing team is required for match videos');
      }
      if (!matchDetails?.matchDate) {
        errors.push('Match date is required for match videos');
      }
      if (!matchDetails?.league.trim()) {
        errors.push('League is required for match videos');
      }
      if (!matchDetails?.homeScore.trim()) {
        errors.push('Home score is required for match videos');
      }
      if (!matchDetails?.awayScore.trim()) {
        errors.push('Away score is required for match videos');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateAllVideos = (): { isValid: boolean; errors: { [videoId: string]: string[] } } => {
    const allErrors: { [videoId: string]: string[] } = {};
    let allValid = true;

    videoItems.forEach(videoItem => {
      const validation = validateVideoItem(videoItem);
      if (!validation.isValid) {
        allValid = false;
        allErrors[videoItem.id] = validation.errors;
      }
    });

    return {
      isValid: allValid,
      errors: allErrors
    };
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Upload Multiple Videos</h2>
          <p className="text-xs sm:text-sm text-white/60">Upload up to 6 videos with individual settings</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel} 
              disabled={isUploading}
              className="flex-1 sm:flex-initial bg-[#1a1a1a] text-white/60 border-0 h-9 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUploadAll}
            disabled={videoItems.length === 0 || isUploading}
            className="flex-1 sm:flex-initial bg-rosegold text-white border-0 h-9 sm:h-10 text-xs sm:text-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Uploading...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Upload All ({videoItems.length})</span>
                <span className="sm:hidden">Upload ({videoItems.length})</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      {isUploading && (
        <Card className="bg-[#111111] border-0">
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-white">Overall Progress</span>
                <span className="text-white/60">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Drop Zone */}
      {videoItems.length < MAX_VIDEOS && (
        <Card
          className={`border-2 border-dashed ${dragActive
            ? 'border-rosegold bg-rosegold/10'
            : 'border-white/20 bg-[#111111]'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-6 sm:p-8 text-center">
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-white/40" />
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
              Drop videos here or click to browse
            </h3>
            <p className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-4">
              Select up to {MAX_VIDEOS - videoItems.length} more video(s) (Max 2GB each)
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#1a1a1a] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Add Videos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Video Items */}
      <div className="space-y-3 sm:space-y-4">
        {videoItems.map((videoItem, index) => (
          <Card key={videoItem.id} className="bg-[#111111] border-0">
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
              <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rosegold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-rosegold font-bold text-sm sm:text-base">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-white text-sm sm:text-base md:text-lg truncate">{videoItem.metadata.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/60 mt-1">
                      <span className="flex items-center gap-1">
                        <FileVideo className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{formatFileSize(videoItem.fileInfo.size)}</span>
                      </span>
                      {videoItem.fileInfo.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          {formatDuration(videoItem.fileInfo.duration)}
                        </span>
                      )}
                      {videoItem.compressionStats && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          {videoItem.compressionStats.ratio}% smaller
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Validation Status */}
                  {(() => {
                    const validation = validateVideoItem(videoItem);
                    return validation.isValid ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    );
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVideoExpanded(videoItem.id)}
                    className="text-white/60 border-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    {videoItem.isExpanded ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVideoItem(videoItem.id)}
                    disabled={isUploading}
                    className="text-red-400 border-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Processing Status */}
            {videoItem.processingStatus.stage !== 'idle' && (
              <CardContent className="pt-0 p-3 sm:p-4 md:p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {videoItem.processingStatus.stage === 'compressing' && (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-blue-400 flex-shrink-0" />
                    )}
                    {videoItem.processingStatus.stage === 'uploading' && (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-yellow-400 flex-shrink-0" />
                    )}
                    {videoItem.processingStatus.stage === 'complete' && (
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                    )}
                    {videoItem.processingStatus.stage === 'error' && (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-white text-xs sm:text-sm">{videoItem.processingStatus.message}</span>
                  </div>
                  <Progress value={videoItem.processingStatus.progress} className="h-2" />
                  {videoItem.processingStatus.stage === 'error' && (
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryVideoUpload(videoItem.id)}
                        className="text-red-400 bg-[#1a1a1a] border-0 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            )}

            {/* Expanded Content */}
            {videoItem.isExpanded && (
              <CardContent className="pt-0 p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Video Preview */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-white text-xs sm:text-sm">Preview</Label>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] sm:text-xs text-white/60">
                          {videoItem.fileInfo.dimensions && (
                            <span>{videoItem.fileInfo.dimensions.width}×{videoItem.fileInfo.dimensions.height}</span>
                          )}
                          {videoItem.fileInfo.duration && (
                            <span className="ml-2">{formatDuration(videoItem.fileInfo.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      {loadingVideos.has(videoItem.id) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-xs sm:text-sm">Processing video...</p>
                          </div>
                        </div>
                      ) : videoItem.previewUrl ? (
                        <div className="relative">
                          {/* Thumbnail overlay */}
                          {videoItem.fileInfo.thumbnailUrl && (
                            <div
                              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                              style={{
                                backgroundImage: `url(${videoItem.fileInfo.thumbnailUrl})`,
                                zIndex: 1
                              }}
                            />
                          )}
                          <video
                            key={videoItem.id}
                            src={videoItem.previewUrl}
                            controls
                            className="w-full h-40 sm:h-48 object-cover relative z-10"
                            preload="metadata"
                            playsInline
                            muted
                            poster={videoItem.fileInfo.thumbnailUrl}
                            onLoadStart={() => {
                              // Hide thumbnail when video starts loading
                              const thumbnail = document.querySelector(`[data-video-id="${videoItem.id}"] .thumbnail-overlay`);
                              if (thumbnail) {
                                (thumbnail as HTMLElement).style.display = 'none';
                              }
                            }}
                            onError={(e) => {
                              console.error('Video preview error:', e);
                              toast({
                                title: "Video Preview Error",
                                description: `Could not load preview for ${videoItem.metadata.title}. The video file may be corrupted or in an unsupported format.`,
                                variant: "destructive"
                              });
                            }}
                            style={{ backgroundColor: '#000' }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-xs sm:text-sm">Loading preview...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Settings */}
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor={`title-${videoItem.id}`} className="text-white text-xs sm:text-sm">Title *</Label>
                      <Input
                        id={`title-${videoItem.id}`}
                        value={videoItem.metadata.title}
                        onChange={(e) => updateVideoMetadata(videoItem.id, { title: e.target.value })}
                        className={`bg-[#1a1a1a] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm ${!videoItem.metadata.title.trim() ? 'ring-2 ring-red-500' : ''}`}
                        placeholder="Enter video title"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`description-${videoItem.id}`} className="text-white text-xs sm:text-sm">Description *</Label>
                      <Textarea
                        id={`description-${videoItem.id}`}
                        value={videoItem.metadata.description}
                        onChange={(e) => updateVideoMetadata(videoItem.id, { description: e.target.value })}
                        className={`bg-[#1a1a1a] text-white border-0 text-xs sm:text-sm ${!videoItem.metadata.description.trim() ? 'ring-2 ring-red-500' : ''}`}
                        placeholder="Enter video description"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`type-${videoItem.id}`} className="text-white text-xs sm:text-sm">Video Type</Label>
                      <Select
                        value={videoItem.metadata.videoType}
                        onValueChange={(value: 'match' | 'training' | 'interview' | 'highlight') =>
                          updateVideoMetadata(videoItem.id, { videoType: value })
                        }
                      >
                        <SelectTrigger className="bg-[#1a1a1a] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-0">
                          <SelectItem value="match" className="text-white text-xs sm:text-sm">Match</SelectItem>
                          <SelectItem value="training" className="text-white text-xs sm:text-sm">Training</SelectItem>
                          <SelectItem value="interview" className="text-white text-xs sm:text-sm">Interview</SelectItem>
                          <SelectItem value="highlight" className="text-white text-xs sm:text-sm">Highlight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Player Tags */}
                    <div>
                      <Label className="text-white text-xs sm:text-sm">Tag Players</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto bg-[#1a1a1a] p-2 sm:p-3 rounded-lg">
                        {teamPlayers.map((player) => (
                          <div key={player.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`player-${videoItem.id}-${player.id}`}
                              checked={videoItem.metadata.playerTags.includes(player.id)}
                              onCheckedChange={(checked) => {
                                const newTags = checked
                                  ? [...videoItem.metadata.playerTags, player.id]
                                  : videoItem.metadata.playerTags.filter(id => id !== player.id);
                                updateVideoMetadata(videoItem.id, { playerTags: newTags });
                              }}
                            />
                            <label
                              htmlFor={`player-${videoItem.id}-${player.id}`}
                              className="text-xs sm:text-sm text-white cursor-pointer"
                            >
                              {player.full_name} ({player.position})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Match Details (if video type is match) */}
                    {videoItem.metadata.videoType === 'match' && (
                      <div className="space-y-3 bg-[#1a1a1a] p-3 sm:p-4 rounded-lg">
                        <Label className="text-white text-xs sm:text-sm">Match Details</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`opposing-${videoItem.id}`} className="text-white text-xs sm:text-sm">Opposing Team *</Label>
                            <Input
                              id={`opposing-${videoItem.id}`}
                              value={videoItem.metadata.matchDetails?.opposingTeam || ''}
                              onChange={(e) => updateVideoMetadata(videoItem.id, {
                                matchDetails: { ...videoItem.metadata.matchDetails!, opposingTeam: e.target.value }
                              })}
                              className={`bg-[#111111] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm ${!videoItem.metadata.matchDetails?.opposingTeam.trim() ? 'ring-2 ring-red-500' : ''}`}
                              placeholder="Team name"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`date-${videoItem.id}`} className="text-white text-xs sm:text-sm">Match Date *</Label>
                            <Input
                              id={`date-${videoItem.id}`}
                              type="date"
                              value={videoItem.metadata.matchDetails?.matchDate || ''}
                              onChange={(e) => updateVideoMetadata(videoItem.id, {
                                matchDetails: { ...videoItem.metadata.matchDetails!, matchDate: e.target.value }
                              })}
                              className={`bg-[#111111] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm ${!videoItem.metadata.matchDetails?.matchDate ? 'ring-2 ring-red-500' : ''}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`league-${videoItem.id}`} className="text-white text-xs sm:text-sm">League *</Label>
                            <LeagueSelect
                              value={videoItem.metadata.matchDetails?.league || ''}
                              onValueChange={(value) => updateVideoMetadata(videoItem.id, {
                                matchDetails: { ...videoItem.metadata.matchDetails!, league: value }
                              })}
                              leagues={sportData.leagues}
                              placeholder="Select league"
                              triggerClassName={`bg-[#111111] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm ${!videoItem.metadata.matchDetails?.league.trim() ? 'ring-2 ring-red-500' : ''}`}
                              contentClassName="bg-[#111111] border-0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`home-score-${videoItem.id}`} className="text-white text-xs sm:text-sm">Home Score *</Label>
                            <Input
                              id={`home-score-${videoItem.id}`}
                              type="number"
                              min="0"
                              value={videoItem.metadata.matchDetails?.homeScore || ''}
                              onChange={(e) => updateVideoMetadata(videoItem.id, {
                                matchDetails: { ...videoItem.metadata.matchDetails!, homeScore: e.target.value }
                              })}
                              className={`bg-[#111111] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm ${!videoItem.metadata.matchDetails?.homeScore.trim() ? 'ring-2 ring-red-500' : ''}`}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`away-score-${videoItem.id}`} className="text-white text-xs sm:text-sm">Away Score *</Label>
                            <Input
                              id={`away-score-${videoItem.id}`}
                              type="number"
                              min="0"
                              value={videoItem.metadata.matchDetails?.awayScore || ''}
                              onChange={(e) => updateVideoMetadata(videoItem.id, {
                                matchDetails: { ...videoItem.metadata.matchDetails!, awayScore: e.target.value }
                              })}
                              className={`bg-[#111111] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm ${!videoItem.metadata.matchDetails?.awayScore.trim() ? 'ring-2 ring-red-500' : ''}`}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`venue-${videoItem.id}`} className="text-white text-xs sm:text-sm">Venue</Label>
                            <Input
                              id={`venue-${videoItem.id}`}
                              value={videoItem.metadata.matchDetails?.venue || ''}
                              onChange={(e) => updateVideoMetadata(videoItem.id, {
                                matchDetails: { ...videoItem.metadata.matchDetails!, venue: e.target.value }
                              })}
                              className="bg-[#111111] text-white border-0 h-9 sm:h-10 text-xs sm:text-sm"
                              placeholder="Stadium name"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EnhancedVideoUploadForm;