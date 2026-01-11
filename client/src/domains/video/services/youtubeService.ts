const YOUTUBE_API_KEY = 'AIzaSyBr3Gi1V_HYC45etDYrnuywYWBa-cruYL4';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  duration: string;
  publishedAt: string;
}

export const getYouTubeVideoInfo = async (videoId: string): Promise<YouTubeVideoInfo | null> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch YouTube video info');
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnails: video.snippet.thumbnails,
        duration: video.contentDetails.duration,
        publishedAt: video.snippet.publishedAt
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching YouTube video info:', error);
    return null;
  }
};

export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

export const getYouTubeEmbedUrl = (videoId: string): string => {
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: window.location.origin,
    rel: '0',
    modestbranding: '1',
    controls: '1',
    disablekb: '0',
    fs: '1',
    iv_load_policy: '3',
    cc_load_policy: '0',
    autoplay: '0',
    mute: '0'
  });
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};
