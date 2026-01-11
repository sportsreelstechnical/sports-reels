
import React from 'react';
import Layout from '@/components/Layout';
import EnhancedVideoManagement from '@/domains/video/components/EnhancedVideoManagement';

const VideoShowcase = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-[#111111]">
        <EnhancedVideoManagement />
      </div>
    </Layout>
  );
};

export default VideoShowcase;
