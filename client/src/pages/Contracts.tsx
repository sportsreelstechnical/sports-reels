
import React from 'react';
import Layout from '@/components/Layout';
import SimplifiedContractWorkflow from '@/components/contracts/SimplifiedContractWorkflow';

const Contracts = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background px-1 py-6 sm:px-3 sm:py-8 lg:px-5">
        <SimplifiedContractWorkflow />
      </div>
    </Layout>
  );
};

export default Contracts;
