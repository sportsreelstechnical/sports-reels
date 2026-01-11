
export interface VideoFile extends File {
  compressed?: boolean;
}

export interface CompressionOptions {
  maxSizeMB: number;
  quality: number;
  width?: number;
  height?: number;
  fastMode?: boolean;
}

export const compressVideoFast = async (
  file: File,
  options: CompressionOptions = { maxSizeMB: 10, quality: 0.7, fastMode: true }
): Promise<VideoFile> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      // Optimize canvas size for speed
      const maxDimension = options.fastMode ? 720 : 1280;
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      if (video.videoWidth > video.videoHeight) {
        canvas.width = Math.min(maxDimension, video.videoWidth);
        canvas.height = canvas.width / aspectRatio;
      } else {
        canvas.height = Math.min(maxDimension, video.videoHeight);
        canvas.width = canvas.height * aspectRatio;
      }
      
      // Use H.264 codec for better compatibility
      const mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
      const videoBitsPerSecond = options.fastMode ? 800000 : 1500000; // Higher bitrate for video quality
      const audioBitsPerSecond = 128000; // Ensure audio quality
      
      const stream = canvas.captureStream(options.fastMode ? 24 : 30);
      
      // Create audio context to ensure audio is captured
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
      
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus', // Use VP8 + Opus for better compatibility
        videoBitsPerSecond,
        audioBitsPerSecond
      });
      
      const chunks: Blob[] = [];
      let frameCount = 0;
      const maxFrames = options.fastMode ? 200 : 400; // Reasonable frame limit
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        
        const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
          type: 'video/webm'
        }) as VideoFile;
        compressedFile.compressed = true;
        resolve(compressedFile);
      };
      
      mediaRecorder.onerror = () => {
        reject(new Error('Video compression failed'));
      };
      
      mediaRecorder.start();
      
      // Optimized frame drawing with consistent timing
      const drawFrame = () => {
        if (!video.ended && !video.paused && frameCount < maxFrames) {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameCount++;
          requestAnimationFrame(drawFrame);
        } else {
          mediaRecorder.stop();
          audioContext.close();
        }
      };
      
      // Set reasonable playback rate
      video.playbackRate = options.fastMode ? 1.0 : 1.0; // Keep normal speed for quality
      video.muted = false; // Ensure audio is not muted
      video.play();
      drawFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
    
    // Enable CORS for video element
    video.crossOrigin = 'anonymous';
    video.src = URL.createObjectURL(file);
  });
};

export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
    video.src = URL.createObjectURL(file);
  });
};

// Enhanced smart compression with better audio/video handling
export const smartCompress = async (file: File): Promise<VideoFile> => {
  const maxSize = 15 * 1024 * 1024; // Increase to 15MB for better quality
  
  if (file.size <= maxSize) {
    // File is already small enough, return as is
    return file as VideoFile;
  }
  
  // File is too large, compress with enhanced mode
  return compressVideoFast(file, {
    maxSizeMB: 15,
    quality: 0.75, // Higher quality
    fastMode: false // Better quality mode
  });
};
