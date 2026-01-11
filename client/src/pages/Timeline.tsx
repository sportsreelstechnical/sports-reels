
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import AgentTimeline from '@/components/AgentTimeline';
import EnhancedTeamTimeline from '@/components/EnhancedTeamTimeline';

const Timeline = () => {
  const { profile } = useAuth();

  return (
    <Layout>
      <div className="space-y-6 bg-background min-h-screen px-3 py-6 sm:px-5 sm:py-8 lg:px-8">
        {profile?.user_type === 'agent' ? (
          <AgentTimeline />
        ) : profile?.user_type === 'team' ? (
          <EnhancedTeamTimeline />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Timeline Access</h2>
            <p className="text-black">Please complete your profile setup to access the timeline.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Timeline;
