import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface VideoRecord {
    id: string;
    title: string;
    video_url: string;
    thumbnail_url: string;
    video_type: string;
    created_at: string;
    team_id: string;
}

export const VideoUploadDebug: React.FC = () => {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVideos = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (fetchError) {
                throw fetchError;
            }

            setVideos(data || []);
        } catch (err) {
            console.error('Error fetching videos:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const testVideoUrl = async (videoUrl: string) => {
        try {
            const response = await fetch(videoUrl, { method: 'HEAD' });
            return {
                status: response.status,
                accessible: response.ok,
                contentType: response.headers.get('content-type'),
            };
        } catch (error) {
            return {
                status: 0,
                accessible: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    const testThumbnailUrl = async (thumbnailUrl: string) => {
        try {
            const response = await fetch(thumbnailUrl, { method: 'HEAD' });
            return {
                status: response.status,
                accessible: response.ok,
                contentType: response.headers.get('content-type'),
            };
        } catch (error) {
            return {
                status: 0,
                accessible: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">Video Upload Debug</CardTitle>
                <div className="flex gap-2">
                    <Button
                        onClick={fetchVideos}
                        disabled={loading}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        {loading ? 'Loading...' : 'Refresh Videos'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
                        Error: {error}
                    </div>
                )}

                <div className="text-gray-300 text-sm">
                    Found {videos.length} recent videos in database
                </div>

                <div className="space-y-4">
                    {videos.map((video) => (
                        <Card key={video.id} className="bg-gray-800 border-gray-700">
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-medium">{video.title}</h3>
                                        <Badge variant="outline" className="text-gray-300">
                                            {video.video_type}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        {/* Video URL Test */}
                                        <div className="space-y-2">
                                            <div className="text-gray-300 font-medium">Video URL:</div>
                                            <div className="text-gray-400 break-all text-xs">
                                                {video.video_url || 'No URL'}
                                            </div>
                                            {video.video_url && (
                                                <VideoUrlTest url={video.video_url} />
                                            )}
                                        </div>

                                        {/* Thumbnail URL Test */}
                                        <div className="space-y-2">
                                            <div className="text-gray-300 font-medium">Thumbnail URL:</div>
                                            <div className="text-gray-400 break-all text-xs">
                                                {video.thumbnail_url || 'No URL'}
                                            </div>
                                            {video.thumbnail_url && (
                                                <ThumbnailUrlTest url={video.thumbnail_url} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        ID: {video.id} | Team: {video.team_id} | Created: {new Date(video.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {videos.length === 0 && !loading && (
                    <div className="text-center text-gray-400 py-8">
                        No videos found in database
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const VideoUrlTest: React.FC<{ url: string }> = ({ url }) => {
    const [testResult, setTestResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const testUrl = async () => {
        setTesting(true);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            setTestResult({
                status: response.status,
                accessible: response.ok,
                contentType: response.headers.get('content-type'),
                size: response.headers.get('content-length'),
            });
        } catch (error) {
            setTestResult({
                status: 0,
                accessible: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-2">
            <Button
                onClick={testUrl}
                disabled={testing}
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
            >
                {testing ? 'Testing...' : 'Test URL'}
            </Button>

            {testResult && (
                <div className={`text-xs p-2 rounded ${testResult.accessible
                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                        : 'bg-red-900/30 text-red-300 border border-red-700'
                    }`}>
                    <div>Status: {testResult.status}</div>
                    <div>Accessible: {testResult.accessible ? 'Yes' : 'No'}</div>
                    {testResult.contentType && <div>Type: {testResult.contentType}</div>}
                    {testResult.size && <div>Size: {testResult.size} bytes</div>}
                    {testResult.error && <div>Error: {testResult.error}</div>}
                </div>
            )}
        </div>
    );
};

const ThumbnailUrlTest: React.FC<{ url: string }> = ({ url }) => {
    const [testResult, setTestResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const testUrl = async () => {
        setTesting(true);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            setTestResult({
                status: response.status,
                accessible: response.ok,
                contentType: response.headers.get('content-type'),
                size: response.headers.get('content-length'),
            });
        } catch (error) {
            setTestResult({
                status: 0,
                accessible: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-2">
            <Button
                onClick={testUrl}
                disabled={testing}
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
            >
                {testing ? 'Testing...' : 'Test URL'}
            </Button>

            {testResult && (
                <div className={`text-xs p-2 rounded ${testResult.accessible
                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                        : 'bg-red-900/30 text-red-300 border border-red-700'
                    }`}>
                    <div>Status: {testResult.status}</div>
                    <div>Accessible: {testResult.accessible ? 'Yes' : 'No'}</div>
                    {testResult.contentType && <div>Type: {testResult.contentType}</div>}
                    {testResult.size && <div>Size: {testResult.size} bytes</div>}
                    {testResult.error && <div>Error: {testResult.error}</div>}
                </div>
            )}
        </div>
    );
};

export default VideoUploadDebug;
