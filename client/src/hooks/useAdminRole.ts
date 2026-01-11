
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminRole = () => {
  const { isAdmin, checkAdminRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!authLoading) {
        await checkAdminRole();
        setLoading(false);
      }
    };

    verifyAdminRole();
  }, [authLoading, checkAdminRole]);

  return {
    isAdmin,
    loading: loading || authLoading
  };
};
