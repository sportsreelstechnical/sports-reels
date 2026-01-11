
import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedTransferTimeline from '@/components/team-explore/EnhancedTransferTimeline';

const TransferTimeline = () => {
  const { profile } = useAuth();
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <EnhancedTransferTimeline 
          userType={profile?.user_type === 'agent' ? 'agent' : 'team'} 
        />
      </div>
    </Layout>
  );
};

export default TransferTimeline;
