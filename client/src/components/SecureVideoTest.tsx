import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SecureThumbnail } from './SecureThumbnail';
import { SecureVideoPlayer } from './SecureVideoPlayer';
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

export const SecureVideoTest: React.FC = () => {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

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

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">Secure Video Display Test</CardTitle>
                <Button onClick={fetchVideos} disabled={loading} variant="outline" className="text-white border-gray-600">
                    {loading ? 'Loading...' : 'Refresh Videos'}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-gray-300 text-sm">
                    Testing secure thumbnail and video display with private R2 bucket
                </div>

                {videos.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        {loading ? 'Loading videos...' : 'No videos found'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {videos.map((video) => (
                            <Card key={video.id} className="bg-gray-800 border-gray-700">
                                <CardContent className="p-4">
                                    <h3 className="text-white font-medium mb-2">{video.title}</h3>

                                    {/* Test Thumbnail Display */}
                                    <div className="mb-4">
                                        <div className="text-gray-300 text-sm mb-2">Thumbnail Test:</div>
                                        <div className="aspect-video bg-gray-900 rounded overflow-hidden">
                                            <SecureThumbnail
                                                thumbnailKey={video.thumbnail_url}
                                                title={video.title}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    </div>

                                    {/* Test Video Player */}
                                    <div className="mb-4">
                                        <div className="text-gray-300 text-sm mb-2">Video Player Test:</div>
                                        <SecureVideoPlayer
                                            videoKey={video.video_url}
                                            thumbnailKey={video.thumbnail_url}
                                            title={video.title}
                                            duration={video.duration}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Debug Info */}
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>Video Key: {video.video_url}</div>
                                        <div>Thumbnail Key: {video.thumbnail_url}</div>
                                        <div>Type: {video.video_type}</div>
                                        <div>Duration: {video.duration}s</div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default SecureVideoTest;
