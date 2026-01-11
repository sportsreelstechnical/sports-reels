import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { runAllMigrations } from '@/utils/migrateVideoUrls';

interface VideoRecord {
    id: string;
    title: string;
    video_url: string;
    thumbnail_url: string;
    video_type: string;
    created_at: string;
    team_id: string;
}

export const DatabaseDebug: React.FC = () => {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [migrating, setMigrating] = useState(false);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setVideos(data || []);
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const runMigration = async () => {
        setMigrating(true);
        try {
            await runAllMigrations();
            // Refresh videos after migration
            await fetchVideos();
        } catch (error) {
            console.error('Migration failed:', error);
        } finally {
            setMigrating(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const analyzeUrl = (url: string) => {
        if (!url) return { type: 'empty', valid: false };

        if (url.startsWith('http://localhost:8082/')) {
            return { type: 'localhost', valid: false, issue: 'Localhost URL - wrong service used' };
        }

        if (url.startsWith('https://pub-')) {
            return { type: 'public', valid: false, issue: 'Public URL - bucket should be private' };
        }

        if (url.startsWith('sports-reels/')) {
            return { type: 'r2-key', valid: true, issue: 'Correct R2 key format' };
        }

        return { type: 'unknown', valid: false, issue: 'Unknown URL format' };
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">Database URL Analysis</CardTitle>
                <div className="flex gap-2">
                    <Button onClick={fetchVideos} disabled={loading} variant="outline" className="text-white border-gray-600">
                        {loading ? 'Loading...' : 'Refresh Videos'}
                    </Button>
                    <Button
                        onClick={runMigration}
                        disabled={migrating || loading}
                        variant="outline"
                        className="text-white border-yellow-600 hover:bg-yellow-600/20"
                    >
                        {migrating ? 'Migrating...' : 'Fix URLs'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-gray-300 text-sm">
                    Analyzing video URLs stored in database to identify the issue
                </div>

                {videos.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        {loading ? 'Loading videos...' : 'No videos found'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {videos.map((video) => {
                            const videoAnalysis = analyzeUrl(video.video_url);
                            const thumbnailAnalysis = analyzeUrl(video.thumbnail_url);

                            return (
                                <Card key={video.id} className="bg-gray-800 border-gray-700">
                                    <CardContent className="p-4">
                                        <h3 className="text-white font-medium mb-3">{video.title}</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Video URL Analysis */}
                                            <div>
                                                <div className="text-gray-300 text-sm font-medium mb-2">Video URL:</div>
                                                <div className={`p-2 rounded text-xs ${videoAnalysis.valid
                                                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                                                    : 'bg-red-900/30 text-red-300 border border-red-700'
                                                    }`}>
                                                    <div className="font-medium">{videoAnalysis.type.toUpperCase()}</div>
                                                    <div className="text-gray-400 break-all">{video.video_url || 'Empty'}</div>
                                                    <div className="text-gray-500">{videoAnalysis.issue}</div>
                                                </div>
                                            </div>

                                            {/* Thumbnail URL Analysis */}
                                            <div>
                                                <div className="text-gray-300 text-sm font-medium mb-2">Thumbnail URL:</div>
                                                <div className={`p-2 rounded text-xs ${thumbnailAnalysis.valid
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
                                            <div>Team: {video.team_id}</div>
                                            <div>Created: {new Date(video.created_at).toLocaleString()}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <div className="text-gray-400 text-xs">
                    <div className="font-medium mb-2">Expected URL Formats:</div>
                    <ul className="space-y-1">
                        <li>✅ <strong>R2 Key:</strong> sports-reels/videos/team-id/video.mp4</li>
                        <li>❌ <strong>Localhost:</strong> http://localhost:8082/sports-reels/...</li>
                        <li>❌ <strong>Public URL:</strong> https://pub-...r2.dev/...</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default DatabaseDebug;
