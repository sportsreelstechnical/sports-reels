import React from 'react';
import { VideoUploadDebug } from '@/domains/video/components/VideoUploadDebug';
import { UploadFlowTest } from '@/components/UploadFlowTest';
import { URLTester } from '@/components/URLTester';
import { SecureVideoTest } from '@/components/SecureVideoTest';
import { DatabaseDebug } from '@/components/DatabaseDebug';
import { BackendConnectionTest } from '@/components/BackendConnectionTest';
import { VideoPlayerTest } from '@/domains/video/components/VideoPlayerTest';

const DebugUpload: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Upload Debug Dashboard</h1>
                    <p className="text-gray-400">Debug video upload issues and test the complete flow</p>
                </div>

                <div className="space-y-8">
                    <BackendConnectionTest />
                    <DatabaseDebug />
                    <VideoPlayerTest />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <UploadFlowTest />
                        <VideoUploadDebug />
                    </div>
                    <SecureVideoTest />
                    <URLTester />
                </div>
            </div>
        </div>
    );
};

export default DebugUpload;
