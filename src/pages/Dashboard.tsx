import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Only check once loading is complete
    if (!loading) {
      console.log('Dashboard - Auth state loaded:', user);
      
      if (!user) {
        // No user, go to login
        navigate('/login', { replace: true });
      } else {
        // User exists, redirect based on role
        console.log('Redirecting to role-specific dashboard:', user.role);
        switch (user.role) {
          case 'customer':
            navigate('/customer', { replace: true });
            break;
          case 'employee':
            navigate('/employee', { replace: true });
            break;
          case 'admin':
            navigate('/admin', { replace: true });
            break;
          default:
            // Unknown role, go to login
            navigate('/login', { replace: true });
        }
      }
    }
  }, [loading, user, navigate]);
  
  // Simple loading display
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-600">Redirecting...</p>
    </div>
  );
};

export default Dashboard;