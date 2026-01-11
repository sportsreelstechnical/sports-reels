import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const URLTester: React.FC = () => {
    const [testUrl, setTestUrl] = useState('');
    const [results, setResults] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const testUrlAccess = async (url: string) => {
        setTesting(true);
        setResults(null);

        try {
            // Test video URL
            const videoResponse = await fetch(url, { method: 'HEAD' });

            // Test thumbnail URL (if it exists)
            const thumbnailUrl = url.replace('/videos/', '/thumbnails/').replace('.mp4', '_thumbnail.jpg');
            let thumbnailResponse = null;

            try {
                thumbnailResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
            } catch (e) {
                // Thumbnail might not exist
            }

            setResults({
                video: {
                    url: url,
                    status: videoResponse.status,
                    accessible: videoResponse.ok,
                    contentType: videoResponse.headers.get('content-type'),
                    size: videoResponse.headers.get('content-length'),
                },
                thumbnail: thumbnailResponse ? {
                    url: thumbnailUrl,
                    status: thumbnailResponse.status,
                    accessible: thumbnailResponse.ok,
                    contentType: thumbnailResponse.headers.get('content-type'),
                    size: thumbnailResponse.headers.get('content-length'),
                } : null
            });

        } catch (error) {
            setResults({
                error: error instanceof Error ? error.message : 'Unknown error',
                url: url
            });
        } finally {
            setTesting(false);
        }
    };

    const testImageDisplay = (url: string) => {
        const img = new Image();
        img.onload = () => {
            setResults(prev => ({
                ...prev,
                imageLoad: { success: true, message: 'Image loads successfully' }
            }));
        };
        img.onerror = () => {
            setResults(prev => ({
                ...prev,
                imageLoad: { success: false, message: 'Image failed to load' }
            }));
        };
        img.src = url;
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">R2 URL Tester</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="testUrl" className="text-white">Video URL to Test</Label>
                    <Input
                        id="testUrl"
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        className="bg-gray-700 text-white border-gray-600"
                        placeholder="https://pub-31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.dev/sports-reels/videos/..."
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => testUrlAccess(testUrl)}
                        disabled={testing || !testUrl}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        {testing ? 'Testing...' : 'Test URL Access'}
                    </Button>

                    <Button
                        onClick={() => testImageDisplay(testUrl.replace('.mp4', '_thumbnail.jpg'))}
                        disabled={!testUrl}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Image Display
                    </Button>
                </div>

                {results && (
                    <div className="space-y-4">
                        {results.error ? (
                            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
                                <div className="font-medium">Error</div>
                                <div className="text-sm">{results.error}</div>
                            </div>
                        ) : (
                            <>
                                {/* Video Results */}
                                <div className={`p-3 rounded border ${results.video.accessible
                                        ? 'bg-green-900/30 border-green-700 text-green-300'
                                        : 'bg-red-900/30 border-red-700 text-red-300'
                                    }`}>
                                    <div className="font-medium">Video URL Test</div>
                                    <div className="text-sm space-y-1">
                                        <div>Status: {results.video.status}</div>
                                        <div>Accessible: {results.video.accessible ? 'Yes' : 'No'}</div>
                                        <div>Content Type: {results.video.contentType || 'Unknown'}</div>
                                        <div>Size: {results.video.size ? `${(parseInt(results.video.size) / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}</div>
                                    </div>
                                </div>

                                {/* Thumbnail Results */}
                                {results.thumbnail && (
                                    <div className={`p-3 rounded border ${results.thumbnail.accessible
                                            ? 'bg-green-900/30 border-green-700 text-green-300'
                                            : 'bg-red-900/30 border-red-700 text-red-300'
                                        }`}>
                                        <div className="font-medium">Thumbnail URL Test</div>
                                        <div className="text-sm space-y-1">
                                            <div>Status: {results.thumbnail.status}</div>
                                            <div>Accessible: {results.thumbnail.accessible ? 'Yes' : 'No'}</div>
                                            <div>Content Type: {results.thumbnail.contentType || 'Unknown'}</div>
                                            <div>Size: {results.thumbnail.size ? `${(parseInt(results.thumbnail.size) / 1024).toFixed(2)} KB` : 'Unknown'}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Image Load Test */}
                                {results.imageLoad && (
                                    <div className={`p-3 rounded border ${results.imageLoad.success
                                            ? 'bg-green-900/30 border-green-700 text-green-300'
                                            : 'bg-red-900/30 border-red-700 text-red-300'
                                        }`}>
                                        <div className="font-medium">Image Display Test</div>
                                        <div className="text-sm">{results.imageLoad.message}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="text-gray-400 text-xs">
                    <div className="font-medium mb-1">Instructions:</div>
                    <ul className="space-y-1">
                        <li>1. Paste your R2 video URL from the database</li>
                        <li>2. Click "Test URL Access" to check if the URL is accessible</li>
                        <li>3. Click "Test Image Display" to check if the thumbnail loads</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default URLTester;
