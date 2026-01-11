import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { useMediaUrls } from '@/hooks/useMediaUrls';

interface MediaUrlTestProps {
    videoKey?: string;
    thumbnailKey?: string;
    title: string;
}

export const MediaUrlTest: React.FC<MediaUrlTestProps> = ({
    videoKey,
    thumbnailKey,
    title
}) => {
    const { videoUrl, thumbnailUrl, loading, error, refresh } = useMediaUrls(
        videoKey,
        thumbnailKey,
        3600
    );

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-4">
                <h3 className="text-white font-medium mb-3">{title}</h3>

                <div className="space-y-3">
                    {/* Thumbnail Test */}
                    <div>
                        <div className="text-gray-300 text-sm mb-2">Thumbnail:</div>
                        <div className="aspect-video bg-gray-800 rounded overflow-hidden">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : error ? (
                                <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
                                    Error: {error}
                                </div>
                            ) : thumbnailUrl ? (
                                <img
                                    src={thumbnailUrl}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No thumbnail
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Video Test */}
                    <div>
                        <div className="text-gray-300 text-sm mb-2">Video:</div>
                        {loading ? (
                            <div className="aspect-video bg-gray-800 rounded flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : error ? (
                            <div className="aspect-video bg-gray-800 rounded flex items-center justify-center text-red-400 text-sm">
                                Error: {error}
                            </div>
                        ) : videoUrl ? (
                            <video
                                src={videoUrl}
                                controls
                                className="w-full aspect-video rounded"
                                onError={(e) => console.error('Video load error:', e)}
                            />
                        ) : (
                            <div className="aspect-video bg-gray-800 rounded flex items-center justify-center text-gray-400">
                                No video
                            </div>
                        )}
                    </div>

                    {/* Debug Info */}
                    <div className="text-xs text-gray-500 space-y-1">
                        <div>Video Key: {videoKey || 'None'}</div>
                        <div>Thumbnail Key: {thumbnailKey || 'None'}</div>
                        <div>Video URL: {videoUrl ? '✅ Generated' : '❌ None'}</div>
                        <div>Thumbnail URL: {thumbnailUrl ? '✅ Generated' : '❌ None'}</div>
                        {error && <div className="text-red-400">Error: {error}</div>}
                    </div>

                    <Button
                        onClick={refresh}
                        disabled={loading}
                        variant="outline"
                        className="w-full text-white border-gray-600"
                    >
                        {loading ? 'Loading...' : 'Refresh URLs'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default MediaUrlTest;
