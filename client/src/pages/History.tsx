
import React from 'react';
import Layout from '@/components/Layout';
import History from '@/components/History';

const HistoryPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background px-3 py-6 sm:px-5 sm:py-8 lg:px-8">
        <History />
      </div>
    </Layout>
  );
};

export default HistoryPage;
