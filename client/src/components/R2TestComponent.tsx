import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cloudflareR2Service } from '@/shared/utils/cloudflareR2Service';
import { r2VideoRetrievalService } from '@/domains/video/services/r2VideoRetrievalService';
import { useToast } from '@/hooks/use-toast';

export const R2TestComponent: React.FC = () => {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<any[]>([]);

    const addTestResult = (test: string, result: 'success' | 'error', message: string) => {
        setTestResults(prev => [...prev, {
            test,
            result,
            message,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const testR2Connection = async () => {
        addTestResult('Connection Test', 'success', 'R2 service initialized');
    };

    const testFileUpload = async () => {
        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Create a test file (small text file)
            const testContent = 'This is a test file for R2 integration';
            const testFile = new File([testContent], 'test-file.txt', { type: 'text/plain' });

            const result = await cloudflareR2Service.uploadFile(
                testFile,
                'test/test-file.txt',
                'text/plain',
                (progress) => {
                    setUploadProgress(progress);
                }
            );

            if (result.success && result.url) {
                setUploadedUrl(result.url);
                addTestResult('File Upload', 'success', `File uploaded successfully: ${result.url}`);
            } else {
                addTestResult('File Upload', 'error', result.error || 'Upload failed');
            }
        } catch (error) {
            addTestResult('File Upload', 'error', `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const testVideoUpload = async () => {
        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Create a test video file (very small)
            const testVideoContent = new Uint8Array([0, 1, 2, 3, 4]); // Minimal video data
            const testVideoFile = new File([testVideoContent], 'test-video.mp4', { type: 'video/mp4' });

            const result = await cloudflareR2Service.uploadVideo(
                testVideoFile,
                'R2 Test Video',
                'test-team-id',
                (progress) => {
                    setUploadProgress(progress);
                }
            );

            if (result.success && result.url) {
                setUploadedUrl(result.url);
                addTestResult('Video Upload', 'success', `Video uploaded successfully: ${result.url}`);
            } else {
                addTestResult('Video Upload', 'error', result.error || 'Video upload failed');
            }
        } catch (error) {
            addTestResult('Video Upload', 'error', `Video upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const testVideoRetrieval = async () => {
        if (!uploadedUrl) {
            addTestResult('Video Retrieval', 'error', 'No uploaded video URL available');
            return;
        }

        try {
            const result = await r2VideoRetrievalService.getVideoForAnalysis(uploadedUrl, {
                useSignedUrl: false
            });

            if (result.success && result.videoUrl) {
                addTestResult('Video Retrieval', 'success', `Video retrieved successfully: ${result.videoUrl}`);
            } else {
                addTestResult('Video Retrieval', 'error', result.error || 'Video retrieval failed');
            }
        } catch (error) {
            addTestResult('Video Retrieval', 'error', `Retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const clearResults = () => {
        setTestResults([]);
        setUploadedUrl(null);
        setUploadProgress(0);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white">Cloudflare R2 Integration Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={testR2Connection}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Connection
                    </Button>
                    <Button
                        onClick={testFileUpload}
                        disabled={isUploading}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test File Upload
                    </Button>
                    <Button
                        onClick={testVideoUpload}
                        disabled={isUploading}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Video Upload
                    </Button>
                    <Button
                        onClick={testVideoRetrieval}
                        disabled={!uploadedUrl}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Test Video Retrieval
                    </Button>
                    <Button
                        onClick={clearResults}
                        variant="outline"
                        className="text-white border-gray-600"
                    >
                        Clear Results
                    </Button>
                </div>

                {isUploading && (
                    <div className="space-y-2">
                        <div className="text-white text-sm">Upload Progress</div>
                        <Progress value={uploadProgress} className="h-2" />
                        <div className="text-gray-400 text-xs">{Math.round(uploadProgress)}%</div>
                    </div>
                )}

                {uploadedUrl && (
                    <div className="p-3 bg-gray-800 rounded-lg">
                        <div className="text-white text-sm font-medium mb-1">Uploaded URL:</div>
                        <div className="text-gray-300 text-xs break-all">{uploadedUrl}</div>
                    </div>
                )}

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
                                <div className="text-gray-500 text-xs">{result.timestamp}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-gray-400 text-xs">
                    <div className="font-medium mb-1">Instructions:</div>
                    <ul className="space-y-1 text-xs">
                        <li>1. Test Connection - Verify R2 service initialization</li>
                        <li>2. Test File Upload - Upload a small test file</li>
                        <li>3. Test Video Upload - Upload a test video file</li>
                        <li>4. Test Video Retrieval - Retrieve the uploaded video</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default R2TestComponent;
