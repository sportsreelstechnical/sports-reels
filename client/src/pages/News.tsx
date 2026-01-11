
import React from 'react';
import Layout from '@/components/Layout';
import News from '@/components/News';

const NewsPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-[#111111]">
        <News />
      </div>
    </Layout>
  );
};

export default NewsPage;
