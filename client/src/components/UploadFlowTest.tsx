import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { presignedUploadService } from '@/domains/video/services/presignedUploadService';
import { useToast } from '@/hooks/use-toast';

export const UploadFlowTest: React.FC = () => {
    const { toast } = useToast();
    const [testResults, setTestResults] = useState<any[]>([]);
    const [teamId, setTeamId] = useState('test-team-id');
    const [testing, setTesting] = useState(false);

    const addTestResult = (test: string, result: 'success' | 'error', message: string, data?: any) => {
        setTestResults(prev => [...prev, {
            test,
            result,
            message,
            data,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const testBackendHealth = async () => {
        try {
            const isHealthy = await presignedUploadService.checkHealth();
            if (isHealthy) {
                addTestResult('Backend Health', 'success', 'Backend service is running');
            } else {
                addTestResult('Backend Health', 'error', 'Backend service is not responding');
            }
        } catch (error) {
            addTestResult('Backend Health', 'error', `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const testPresignedUrlGeneration = async () => {
        try {
            // Create a small test file
            const testContent = 'test video content';
            const testFile = new File([testContent], 'test-video.mp4', { type: 'video/mp4' });

            const result = await presignedUploadService.uploadVideo(
                testFile,
                'Test Video',
                teamId,
                (progress) => {
                    console.log('Upload progress:', progress);
                }
            );

            if (result.success) {
                addTestResult('Presigned Upload', 'success', 'Video uploaded successfully', result);
            } else {
                addTestResult('Presigned Upload', 'error', result.error || 'Upload failed');
            }
        } catch (error) {
            addTestResult('Presigned Upload', 'error', `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const testThumbnailUpload = async () => {
        try {
            // Create a small test thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, 100, 100);
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText('TEST', 30, 50);
            }

            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        const result = await presignedUploadService.uploadThumbnail(
                            blob,
                            'Test Video',
                            teamId,
                            (progress) => {
                                console.log('Thumbnail upload progress:', progress);
                            }
                        );

                        if (result.success) {
                            addTestResult('Thumbnail Upload', 'success', 'Thumbnail uploaded successfully', result);
                        } else {
                            addTestResult('Thumbnail Upload', 'error', result.error || 'Thumbnail upload failed');
                        }
                    } catch (error) {
                        addTestResult('Thumbnail Upload', 'error', `Thumbnail error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }
            }, 'image/jpeg', 0.8);
        } catch (error) {
            addTestResult('Thumbnail Upload', 'error', `Thumbnail creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const runAllTests = async () => {
        setTesting(true);
        setTestResults([]);

        try {
            await testBackendHealth();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testPresignedUrlGeneration();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testThumbnailUpload();
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
                <CardTitle className="text-white">Upload Flow Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="teamId" className="text-white">Team ID</Label>
                    <Input
                        id="teamId"
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        className="bg-gray-700 text-white border-gray-600"
                        placeholder="Enter team ID"
                    />
                </div>

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
                        onClick={testPresignedUrlGeneration}
                        disabled={testing}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Video Upload
                    </Button>
                    <Button
                        onClick={testThumbnailUpload}
                        disabled={testing}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Thumbnail Upload
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
                        Clear Results
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="text-white text-sm font-medium">Test Results:</div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {testResults.map((result, index) => (
                            <div
                                key={index}
                                className={`p-2 rounded text-xs ${result.result === 'success'
                                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                                        : 'bg-red-900/30 text-red-300 border border-red-700'
                                    }`}
                            >
                                <div className="font-medium">{result.test}</div>
                                <div className="text-gray-400">{result.message}</div>
                                {result.data && (
                                    <div className="text-gray-500 mt-1">
                                        <div>URL: {result.data.url}</div>
                                        <div>Key: {result.data.key}</div>
                                    </div>
                                )}
                                <div className="text-gray-500 text-xs">{result.timestamp}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-gray-400 text-xs">
                    <div className="font-medium mb-1">Instructions:</div>
                    <ul className="space-y-1 text-xs">
                        <li>1. Test Backend Health - Verify backend service is running</li>
                        <li>2. Test Video Upload - Upload a small test video</li>
                        <li>3. Test Thumbnail Upload - Upload a test thumbnail</li>
                        <li>4. Run All Tests - Execute all tests in sequence</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default UploadFlowTest;
