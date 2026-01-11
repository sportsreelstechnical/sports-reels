
import React from 'react';
import { AgentExploreHub } from './agent-explore/AgentExploreHub';

interface AgentExploreProps {
  initialSearch?: string;
}

const AgentExplore: React.FC<AgentExploreProps> = ({ initialSearch }) => {
  return <AgentExploreHub initialSearch={initialSearch} />;
};

export default AgentExplore;
