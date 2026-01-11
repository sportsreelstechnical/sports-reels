
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Layout from '@/components/Layout';
import VideoAnalysisPageTabs from '@/domains/video/components/VideoAnalysisPageTabs';

const VideoAnalysis = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  if (!videoId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-red-400 mb-4">Video ID is required</p>
          <Button onClick={handleBack} className="bg-rosegold text-black hover:bg-rosegold/90">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-white hover:text-rosegold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-polysans text-white">Video Analysis</h1>
        </div>

        {/* Video Analysis Component */}
        <VideoAnalysisPageTabs
          videoId={videoId}
        />
      </div>
    </Layout>
  );
};

export default VideoAnalysis;
