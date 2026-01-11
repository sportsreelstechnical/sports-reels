import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import { supabase } from '@/integrations/supabase/client';

interface VideoRecord {
    id: string;
    title: string;
    video_url: string;
    thumbnail_url: string;
    video_type: string;
    created_at: string;
    duration: number;
}

export const VideoPlayerTest: React.FC = () => {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) throw error;
            setVideos(data || []);
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const analyzeVideoUrl = (url: string) => {
        if (!url) return { type: 'empty', valid: false };

        if (url.startsWith('sports-reels/')) {
            return { type: 'r2-key', valid: true, issue: 'R2 key - needs signed URL' };
        }

        if (url.includes('supabase') || url.includes('storage.googleapis.com')) {
            return { type: 'supabase', valid: true, issue: 'Supabase URL - direct access' };
        }

        if (url.includes('pub-') && url.includes('.r2.dev')) {
            return { type: 'public-r2', valid: true, issue: 'Public R2 URL - direct access' };
        }

        return { type: 'unknown', valid: false, issue: 'Unknown URL format' };
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">Video Player Test</CardTitle>
                <Button onClick={fetchVideos} disabled={loading} variant="outline" className="text-white border-gray-600">
                    {loading ? 'Loading...' : 'Refresh Videos'}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-gray-300 text-sm">
                    Testing smart video player with different URL formats
                </div>

                {videos.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        {loading ? 'Loading videos...' : 'No videos found'}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {videos.map((video) => {
                            const videoAnalysis = analyzeVideoUrl(video.video_url);
                            const thumbnailAnalysis = analyzeVideoUrl(video.thumbnail_url);

                            return (
                                <Card key={video.id} className="bg-gray-800 border-gray-700">
                                    <CardContent className="p-4">
                                        <h3 className="text-white font-medium mb-3">{video.title}</h3>

                                        {/* Video Player Test */}
                                        <div className="mb-4">
                                            <div className="text-gray-300 text-sm mb-2">Video Player:</div>
                                            <div className="aspect-video bg-gray-900 rounded overflow-hidden">
                                                <SmartVideoPlayer
                                                    videoUrl={video.video_url}
                                                    thumbnailUrl={video.thumbnail_url}
                                                    title={video.title}
                                                    duration={video.duration}
                                                    className="w-full h-full"
                                                    controls={true}
                                                    autoPlay={false}
                                                />
                                            </div>
                                        </div>

                                        {/* Debug Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                                            <div>
                                                <div className="font-medium text-gray-300 mb-1">Video URL:</div>
                                                <div className={`p-2 rounded ${videoAnalysis.valid
                                                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                                                        : 'bg-red-900/30 text-red-300 border border-red-700'
                                                    }`}>
                                                    <div className="font-medium">{videoAnalysis.type.toUpperCase()}</div>
                                                    <div className="text-gray-400 break-all">{video.video_url || 'Empty'}</div>
                                                    <div className="text-gray-500">{videoAnalysis.issue}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="font-medium text-gray-300 mb-1">Thumbnail URL:</div>
                                                <div className={`p-2 rounded ${thumbnailAnalysis.valid
                                                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                                                        : 'bg-red-900/30 text-red-300 border border-red-700'
                                                    }`}>
                                                    <div className="font-medium">{thumbnailAnalysis.type.toUpperCase()}</div>
                                                    <div className="text-gray-400 break-all">{video.thumbnail_url || 'Empty'}</div>
                                                    <div className="text-gray-500">{thumbnailAnalysis.issue}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 text-xs text-gray-500">
                                            <div>ID: {video.id}</div>
                                            <div>Type: {video.video_type}</div>
                                            <div>Duration: {video.duration}s</div>
                                            <div>Created: {new Date(video.created_at).toLocaleString()}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <div className="text-gray-400 text-xs">
                    <div className="font-medium mb-2">Expected Behavior:</div>
                    <ul className="space-y-1">
                        <li>✅ <strong>R2 Key:</strong> Shows thumbnail with play button, generates signed URL on play</li>
                        <li>✅ <strong>Supabase URL:</strong> Direct video playback</li>
                        <li>✅ <strong>Public R2 URL:</strong> Direct video playback</li>
                        <li>❌ <strong>Empty/Invalid:</strong> Shows placeholder</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default VideoPlayerTest;
