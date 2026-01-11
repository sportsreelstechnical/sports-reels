import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import TeamWalletPage from './TeamWalletPage';
import AgentWalletPage from './AgentWalletPage';
const WalletPage: React.FC = () => {
  const { profile, user, loading } = useAuth();


  // Authentication successful, routing to appropriate wallet

  // Show loading state while authentication is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-3 sm:px-4">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  // Render appropriate wallet based on user type
  // Render appropriate wallet based on user type
  if (profile.user_type === 'team') {
    return <TeamWalletPage />;
  } else if (profile.user_type === 'agent') {
    return <AgentWalletPage />;
  }

  // Fallback redirect for unknown user types
  return <Navigate to="/" replace />;
};

export default WalletPage;
