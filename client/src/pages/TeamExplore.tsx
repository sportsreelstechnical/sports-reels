
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { TeamExploreHub } from '@/components/team-explore/TeamExploreHub';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const TeamExplore = () => {
  const { profile } = useAuth();

  if (profile?.user_type !== 'team') {
    return (
      <Layout>
        <div className="min-h-screen bg-background p-6">
          <Card className="max-w-md mx-auto mt-20 border-red-500">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
              <p className="text-black">
                This page is only available for team accounts. Please complete your team profile setup.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TeamExploreHub />
    </Layout>
  );
};

export default TeamExplore;
