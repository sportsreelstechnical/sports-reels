import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { presignedGetUrlService } from '@/domains/video/services/presignedGetUrlService';

export const BackendConnectionTest: React.FC = () => {
    const [testResults, setTestResults] = useState<any[]>([]);
    const [testing, setTesting] = useState(false);

    const addResult = (test: string, success: boolean, message: string, data?: any) => {
        setTestResults(prev => [...prev, {
            test,
            success,
            message,
            data,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const testBackendHealth = async () => {
        try {
            const isHealthy = await presignedGetUrlService.checkHealth();
            addResult(
                'Backend Health Check',
                isHealthy,
                isHealthy ? 'Backend is responding' : 'Backend not responding'
            );
        } catch (error) {
            addResult(
                'Backend Health Check',
                false,
                `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    };

    const testSignedUrlGeneration = async () => {
        try {
            const testKey = 'sports-reels/videos/test/test-video.mp4';
            const result = await presignedGetUrlService.getPresignedUrl(testKey, 3600);

            addResult(
                'Signed URL Generation',
                result.success,
                result.success ? 'Successfully generated signed URL' : result.error || 'Failed',
                result.success ? { url: result.url } : null
            );
        } catch (error) {
            addResult(
                'Signed URL Generation',
                false,
                `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    };

    const testMediaUrls = async () => {
        try {
            const videoKey = 'sports-reels/videos/test/test-video.mp4';
            const thumbnailKey = 'sports-reels/thumbnails/test/test-thumbnail.jpg';

            const result = await presignedGetUrlService.getSignedMediaUrls(videoKey, thumbnailKey, 3600);

            addResult(
                'Media URLs Generation',
                result.success,
                result.success ? 'Successfully generated media URLs' : result.error || 'Failed',
                result.success ? {
                    videoUrl: result.videoUrl ? 'Generated' : 'None',
                    thumbnailUrl: result.thumbnailUrl ? 'Generated' : 'None'
                } : null
            );
        } catch (error) {
            addResult(
                'Media URLs Generation',
                false,
                `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    };

    const runAllTests = async () => {
        setTesting(true);
        setTestResults([]);

        try {
            await testBackendHealth();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testSignedUrlGeneration();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testMediaUrls();
        } finally {
            setTesting(false);
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">Backend Connection Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={testBackendHealth}
                        disabled={testing}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Backend Health
                    </Button>
                    <Button
                        onClick={testSignedUrlGeneration}
                        disabled={testing}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Signed URL
                    </Button>
                    <Button
                        onClick={testMediaUrls}
                        disabled={testing}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Media URLs
                    </Button>
                    <Button
                        onClick={runAllTests}
                        disabled={testing}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Run All Tests
                    </Button>
                    <Button
                        onClick={clearResults}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Clear
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="text-white text-sm font-medium">Test Results:</div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {testResults.map((result, index) => (
                            <div
                                key={index}
                                className={`p-2 rounded text-xs ${result.success
                                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                                        : 'bg-red-900/30 text-red-300 border border-red-700'
                                    }`}
                            >
                                <div className="font-medium">{result.test}</div>
                                <div className="text-gray-400">{result.message}</div>
                                {result.data && (
                                    <div className="text-gray-500 mt-1">
                                        {Object.entries(result.data).map(([key, value]) => (
                                            <div key={key}>{key}: {String(value)}</div>
                                        ))}
                                    </div>
                                )}
                                <div className="text-gray-500 text-xs">{result.timestamp}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-gray-400 text-xs">
                    <div className="font-medium mb-1">What to check:</div>
                    <ul className="space-y-1 text-xs">
                        <li>1. Backend Health - Is the service running on port 3001?</li>
                        <li>2. Signed URL - Can we generate a signed URL from an R2 key?</li>
                        <li>3. Media URLs - Can we generate both video and thumbnail URLs?</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default BackendConnectionTest;
