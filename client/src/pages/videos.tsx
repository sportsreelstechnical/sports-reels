
import React from 'react';
import Layout from '@/components/Layout';
import EnhancedVideoManagement from '@/domains/video/components/EnhancedVideoManagement';

const Videos = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <EnhancedVideoManagement />
      </div>
    </Layout>
  );
};

export default Videos;
