import { supabase } from '@/integrations/supabase/client';

export interface CompressionResult {
  originalFile: File;
  compressedFile: File;
  originalSizeMB: number;
  compressedSizeMB: number;
  compressionRatio: number;
  quality: 'high' | 'medium' | 'low';
  processingTime: number;
  thumbnailBlob?: Blob;
}

export interface CompressionOptions {
  targetSizeMB: number;
  maxQuality: 'high' | 'medium' | 'low';
  maintainAspectRatio: boolean;
  generateThumbnail: boolean;
}

export class EnhancedVideoCompressionService {
  private defaultOptions: CompressionOptions = {
    targetSizeMB: 10,
    maxQuality: 'high',
    maintainAspectRatio: true,
    generateThumbnail: true
  };

  /**
   * Compress video to target size with improved quality optimization
   */
  async compressVideo(
    file: File,
    options: Partial<CompressionOptions> = {},
    videoId?: string
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const finalOptions = { ...this.defaultOptions, ...options };
    
    console.log(`Starting enhanced video compression for ${file.name}`);
    console.log(`Target size: ${finalOptions.targetSizeMB}MB`);
    console.log(`Original size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);

    const originalSizeMB = file.size / (1024 * 1024);

    // Log compression start to database
    let logId: string | null = null;
    if (videoId) {
      logId = await this.logCompressionStart(videoId, originalSizeMB, finalOptions.targetSizeMB);
    }

    try {
      // Generate thumbnail if requested
      let thumbnailBlob: Blob | undefined;
      if (finalOptions.generateThumbnail) {
        thumbnailBlob = await this.generateThumbnail(file);
      }

      // Use fast, efficient compression
      const compressedFile = await this.fastCompress(file, finalOptions.targetSizeMB, finalOptions.maxQuality);

      const processingTime = Date.now() - startTime;
      const compressedSizeMB = compressedFile.size / (1024 * 1024);
      const compressionRatio = 1 - (compressedSizeMB / originalSizeMB);

      const result: CompressionResult = {
        originalFile: file,
        compressedFile,
        originalSizeMB,
        compressedSizeMB,
        compressionRatio,
        quality: this.determineQuality(compressionRatio),
        processingTime,
        thumbnailBlob
      };

      // Log compression completion to database
      if (logId) {
        await this.logCompressionComplete(logId, result);
      }

      console.log(`Enhanced compression completed successfully:`);
      console.log(`- Original: ${originalSizeMB.toFixed(2)}MB`);
      console.log(`- Compressed: ${compressedSizeMB.toFixed(2)}MB`);
      console.log(`- Ratio: ${(compressionRatio * 100).toFixed(1)}%`);
      console.log(`- Quality: ${result.quality}`);
      console.log(`- Time: ${processingTime}ms`);

      return result;

    } catch (error) {
      console.error('Enhanced video compression failed:', error);
      
      // Log compression error to database
      if (logId) {
        await this.logCompressionError(logId, error);
      }
      
      throw new Error(`Enhanced video compression failed: ${error.message}`);
    }
  }

  /**
   * Log compression start to database
   */
  private async logCompressionStart(videoId: string, originalSizeMB: number, targetSizeMB: number): Promise<string | null> {
    try {
      console.log('Logging compression start to database');
      const { data, error } = await supabase
        .from('video_compression_logs')
        .insert({
          video_id: videoId,
          original_size_mb: originalSizeMB,
          target_size_mb: targetSizeMB,
          compression_status: 'processing',
          compression_algorithm: 'h264'
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Failed to log compression start:', error);
        return null;
      }

      console.log('Compression start logged with ID:', data.id);
      return data.id;
    } catch (error) {
      console.warn('Failed to log compression start:', error);
      return null;
    }
  }

  /**
   * Log compression completion to database
   */
  private async logCompressionComplete(logId: string, result: CompressionResult): Promise<void> {
    try {
      console.log('Logging compression completion to database');
      const { error } = await supabase
        .from('video_compression_logs')
        .update({
          compressed_size_mb: result.compressedSizeMB,
          compression_ratio: result.compressionRatio,
          compression_status: 'completed',
          processing_time: Math.round(result.processingTime / 1000), // Convert to seconds
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (error) {
        console.warn('Failed to log compression completion:', error);
      } else {
        console.log('Compression completion logged successfully');
      }
    } catch (error) {
      console.warn('Failed to log compression completion:', error);
    }
  }

  /**
   * Log compression error to database
   */
  private async logCompressionError(logId: string, error: any): Promise<void> {
    try {
      console.log('Logging compression error to database');
      const { error: dbError } = await supabase
        .from('video_compression_logs')
        .update({
          compression_status: 'failed',
          error_message: error.message || 'Unknown error occurred',
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (dbError) {
        console.warn('Failed to log compression error:', dbError);
      } else {
        console.log('Compression error logged successfully');
      }
    } catch (dbError) {
      console.warn('Failed to log compression error:', dbError);
    }
  }

  /**
   * Fast, efficient compression that prioritizes speed and size reduction
   */
  private async fastCompress(
    file: File,
    targetSizeMB: number,
    maxQuality: 'high' | 'medium' | 'low'
  ): Promise<File> {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;
    const originalSizeMB = file.size / (1024 * 1024);
    
    // If file is already smaller than target, return original
    if (file.size <= targetSizeBytes) {
      console.log('File already smaller than target, returning original');
      return file;
    }
    
    // Calculate compression ratio needed
    const compressionRatio = targetSizeBytes / file.size;
    
    // Determine quality settings based on compression ratio needed
    let qualitySettings;
    if (compressionRatio < 0.3) {
      // Need heavy compression
      qualitySettings = {
        bitrate: Math.max(500, Math.floor(originalSizeMB * 100)), // Lower bitrate
        scale: 0.6, // Smaller resolution
        frameRate: 24 // Lower frame rate
      };
    } else if (compressionRatio < 0.6) {
      // Moderate compression
      qualitySettings = {
        bitrate: Math.max(800, Math.floor(originalSizeMB * 150)),
        scale: 0.8,
        frameRate: 30
      };
    } else {
      // Light compression
      qualitySettings = {
        bitrate: Math.max(1200, Math.floor(originalSizeMB * 200)),
        scale: 0.9,
        frameRate: 30
      };
    }
    
    console.log(`Fast compression settings:`, qualitySettings);
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = async () => {
        try {
          // Calculate dimensions
          const width = Math.floor(video.videoWidth * qualitySettings.scale);
          const height = Math.floor(video.videoHeight * qualitySettings.scale);
          
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          // Use MediaRecorder with optimized settings
          const stream = canvas.captureStream(qualitySettings.frameRate);
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp8', // Use VP8 for better compatibility
            videoBitsPerSecond: qualitySettings.bitrate * 1000
          });
          
          const chunks: Blob[] = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const compressedFile = new File([blob], 
              file.name.replace(/\.[^/.]+$/, "_compressed.webm"), 
              { type: 'video/webm' }
            );
            resolve(compressedFile);
          };
          
          mediaRecorder.onerror = (event) => {
            reject(new Error('MediaRecorder error: ' + event));
          };
          
          mediaRecorder.start(100); // Collect data every 100ms for speed
          
          // Draw video frames to canvas
          const drawFrame = () => {
            if (video.ended || video.paused) {
              mediaRecorder.stop();
              return;
            }
            
            ctx.drawImage(video, 0, 0, width, height);
            requestAnimationFrame(drawFrame);
          };
          
          // Start drawing and playing
          video.currentTime = 0;
          
          // Handle play interruption gracefully
          try {
            await video.play();
            drawFrame();
          } catch (playError) {
            console.warn('Video play interrupted, using alternative method:', playError);
            // Alternative: just draw the first frame and create a static video
            ctx.drawImage(video, 0, 0, width, height);
            setTimeout(() => {
              mediaRecorder.stop();
            }, 100);
          }
          
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => reject(new Error('Video loading failed'));
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Improved compression with better quality preservation
   */
  private async compressWithImprovedQuality(
    file: File,
    targetSizeMB: number,
    maxQuality: 'high' | 'medium' | 'low'
  ): Promise<File> {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;
    
    try {
      // Use improved quality levels with better bitrate management
      const qualityLevels = this.getImprovedQualityLevels(maxQuality);
      
      for (const quality of qualityLevels) {
        try {
          console.log(`Attempting improved compression with quality: ${quality.name}`);
          
          const compressed = await this.compressWithImprovedSettings(file, quality);
          
          if (compressed.size <= targetSizeBytes) {
            console.log(`Target size achieved with quality: ${quality.name}`);
            return compressed;
          }
          
          console.log(`Quality ${quality.name} resulted in ${(compressed.size / (1024 * 1024)).toFixed(2)}MB`);
          
        } catch (error) {
          console.warn(`Compression with quality ${quality.name} failed:`, error);
          continue;
        }
      }

      // If all quality levels fail, use the lowest quality as fallback
      console.log('Using fallback compression with lowest quality');
      return await this.compressWithImprovedSettings(file, qualityLevels[qualityLevels.length - 1]);
      
    } catch (error) {
      console.warn('Improved compression failed, using simple fallback:', error);
      return await this.simpleCompressionFallback(file, targetSizeMB);
    }
  }

  /**
   * Compress video with improved quality settings
   */
  private async compressWithImprovedSettings(file: File, quality: any): Promise<File> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = async () => {
        try {
          // Calculate optimal dimensions with better aspect ratio handling
          const { width, height } = this.calculateOptimalDimensions(
            video.videoWidth,
            video.videoHeight,
            quality.scale
          );
          
          // Use MediaRecorder with improved settings
          const stream = await this.createVideoStream(video, width, height, quality.frameRate);
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: quality.bitrate * 1000,
            audioBitsPerSecond: Math.min(128000, quality.bitrate * 100) // Better audio quality
          });
          
          const chunks: Blob[] = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const compressedFile = new File([blob], 
              file.name.replace(/\.[^/.]+$/, "_compressed.webm"), 
              { type: 'video/webm' }
            );
            resolve(compressedFile);
          };
          
          mediaRecorder.onerror = (event) => {
            reject(new Error('MediaRecorder error: ' + event));
          };
          
          mediaRecorder.start(1000); // Collect data every second for better quality
          
          // Play video for recording
          video.currentTime = 0;
          await video.play();
          
          // Stop recording when video ends
          video.onended = () => {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          };
          
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => reject(new Error('Video loading failed'));
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create video stream with improved quality
   */
  private async createVideoStream(video: HTMLVideoElement, width: number, height: number, frameRate: number): Promise<MediaStream> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: false, // Improve performance
      alpha: false // Better compression for videos without transparency
    });
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Set up high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const drawFrame = () => {
      ctx.drawImage(video, 0, 0, width, height);
    };
    
    // Draw initial frame
    drawFrame();
    
    // Create stream with specified frame rate
    const stream = canvas.captureStream(frameRate);
    
    // Update canvas as video plays
    const updateCanvas = () => {
      if (!video.paused && !video.ended) {
        drawFrame();
        requestAnimationFrame(updateCanvas);
      }
    };
    
    video.onplay = () => updateCanvas();
    
    return stream;
  }

  /**
   * Calculate optimal dimensions with better quality preservation
   */
  private calculateOptimalDimensions(originalWidth: number, originalHeight: number, scale: number) {
    const aspectRatio = originalWidth / originalHeight;
    
    // Ensure dimensions are even numbers for better encoding
    let newWidth = Math.floor(originalWidth * scale);
    let newHeight = Math.floor(newWidth / aspectRatio);
    
    // Make sure dimensions are even
    if (newWidth % 2 !== 0) newWidth -= 1;
    if (newHeight % 2 !== 0) newHeight -= 1;
    
    // Ensure minimum dimensions for quality
    const minWidth = 320;
    const minHeight = 240;
    
    if (newWidth < minWidth) {
      newWidth = minWidth;
      newHeight = Math.floor(minWidth / aspectRatio);
      if (newHeight % 2 !== 0) newHeight -= 1;
    }
    
    if (newHeight < minHeight) {
      newHeight = minHeight;
      newWidth = Math.floor(minHeight * aspectRatio);
      if (newWidth % 2 !== 0) newWidth -= 1;
    }
    
    return { width: newWidth, height: newHeight };
  }

  /**
   * Get improved quality levels for better compression
   */
  private getImprovedQualityLevels(maxQuality: 'high' | 'medium' | 'low') {
    const allLevels = [
      { name: 'ultra', scale: 1.0, frameRate: 30, bitrate: 5000 }, // Reduced for better quality/size balance
      { name: 'high', scale: 0.85, frameRate: 30, bitrate: 3500 },
      { name: 'medium', scale: 0.7, frameRate: 25, bitrate: 2500 },
      { name: 'low', scale: 0.5, frameRate: 20, bitrate: 1500 },
      { name: 'minimum', scale: 0.35, frameRate: 15, bitrate: 800 }
    ];
    
    const maxQualityIndex = allLevels.findIndex(level => level.name === maxQuality);
    return allLevels.slice(maxQualityIndex >= 0 ? maxQualityIndex : 1);
  }

  /**
   * Determine quality level based on compression ratio
   */
  private determineQuality(compressionRatio: number): 'high' | 'medium' | 'low' {
    if (compressionRatio < 0.3) return 'high';
    if (compressionRatio < 0.6) return 'medium';
    return 'low';
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(file: File, timeOffset: number = 5): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = Math.min(timeOffset, video.duration);
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Thumbnail generation failed'));
            }
          }, 'image/jpeg', 0.8);
        };
      };
      
      video.onerror = () => reject(new Error('Video loading failed'));
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get compression statistics for a video
   */
  async getCompressionStats(videoId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('video_compression_logs')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Failed to get compression stats:', error);
      return null;
    }
  }

  /**
   * Validate video file before compression
   */
  validateVideoFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('video/')) {
      return { isValid: false, error: 'File must be a video' };
    }

    // Check file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 2GB' };
    }

    // Check if already compressed
    if (file.size <= this.defaultOptions.targetSizeMB * 1024 * 1024) {
      return { isValid: false, error: 'File is already within target size' };
    }

    return { isValid: true };
  }

  /**
   * Simple compression fallback when advanced compression fails
   */
  private async simpleCompressionFallback(file: File, targetSizeMB: number): Promise<File> {
    console.log('Using simple compression fallback');
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.onloadedmetadata = () => {
        // Reduce dimensions for compression
        const maxWidth = 640;
        const maxHeight = 480;
        let { videoWidth, videoHeight } = video;
        
        if (videoWidth > maxWidth || videoHeight > maxHeight) {
          const aspectRatio = videoWidth / videoHeight;
          if (videoWidth > videoHeight) {
            videoWidth = maxWidth;
            videoHeight = maxWidth / aspectRatio;
          } else {
            videoHeight = maxHeight;
            videoWidth = maxHeight * aspectRatio;
          }
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        const mediaRecorder = new MediaRecorder(canvas.captureStream(), {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 500000, // 500kbps
          audioBitsPerSecond: 64000   // 64kbps
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, ".webm"), {
            type: 'video/webm',
            lastModified: Date.now()
          });
          
          console.log(`Simple compression completed: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
          resolve(compressedFile);
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error('MediaRecorder error: ' + event));
        };

        let currentTime = 0;
        const frameRate = 15; // Reduced frame rate
        const frameInterval = 1 / frameRate;

        const processFrame = () => {
          if (currentTime < video.duration) {
            video.currentTime = currentTime;
            
            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
              currentTime += frameInterval;
              
              if (currentTime < video.duration) {
                setTimeout(processFrame, 1000 / frameRate);
              } else {
                mediaRecorder.stop();
              }
            };
          }
        };

        mediaRecorder.start();
        processFrame();
      };

      video.onerror = () => reject(new Error('Video loading failed'));
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Estimate compression time based on file size
   */
  estimateCompressionTime(fileSizeMB: number): number {
    // Rough estimation: 1 second per MB for processing
    const baseTime = fileSizeMB;
    const qualityFactor = 1.5; // Higher quality takes longer
    return Math.ceil(baseTime * qualityFactor);
  }
}

export default EnhancedVideoCompressionService;
