
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import AgentExplore from '@/components/AgentExplore';
import TeamExploreHub from '@/components/team-explore/TeamExploreHub';
import { useSearchParams } from 'react-router-dom';

const Explore = () => {
  const { profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  // Pass search query to child components
  const exploreProps = searchQuery ? { initialSearch: searchQuery } : {};

  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading explore hub...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (profile?.user_type === 'agent') {
    return (
      <Layout>
        <AgentExplore {...exploreProps} />
      </Layout>
    );
  }

  return (
    <Layout>
      <TeamExploreHub {...exploreProps} />
    </Layout>
  );
};

export default Explore;
