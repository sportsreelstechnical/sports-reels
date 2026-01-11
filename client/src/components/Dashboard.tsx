
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AgentDashboard from '@/components/AgentDashboard';
import TeamDashboard from '@/components/TeamDashboard';

const Dashboard = () => {
  const { profile } = useAuth();

  // Show agent dashboard for agents
  if (profile?.user_type === 'agent') {
    return <AgentDashboard />;
  }

  // Show team dashboard for teams
  return <TeamDashboard />;
};

export default Dashboard;
