
export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateVideoOrientation = (file: File): Promise<VideoValidationResult> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = video;
      const isLandscape = videoWidth > videoHeight;
      
      URL.revokeObjectURL(url);
      
      if (!isLandscape) {
        resolve({
          isValid: false,
          errors: ['Video must be in landscape orientation (width > height)']
        });
      } else {
        resolve({
          isValid: true,
          errors: []
        });
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        errors: ['Invalid video file']
      });
    };
    
    video.src = url;
  });
};

export const validateVideoUrl = (url: string): VideoValidationResult => {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('Video URL is required');
    return { isValid: false, errors };
  }
  
  // Basic URL validation
  try {
    new URL(url);
  } catch {
    errors.push('Invalid URL format');
  }
  
  // Check for supported video platforms/formats
  const supportedPlatforms = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'streamable.com'
  ];
  
  const isSupported = supportedPlatforms.some(platform => 
    url.toLowerCase().includes(platform)
  );
  
  if (!isSupported) {
    errors.push('URL must be from a supported platform (YouTube, Vimeo, Streamable)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
