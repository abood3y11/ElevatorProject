import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';

// This is a general-purpose ProtectedRoute component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  role?: UserRole;
}> = ({ children, role }) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  console.log(`ProtectedRoute (${role || 'any'}) - Auth state:`, { user, loading, isAuthenticated, requiredRole: role });
  
  // Show loading indicator while checking auth status
  if (loading) {
    return <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-600">Checking authentication...</p>
    </div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If role is specified and user's role doesn't match, redirect to appropriate dashboard
  if (role && user?.role !== role) {
    console.log(`Role mismatch: Required ${role}, user has ${user?.role}`);
    switch (user?.role) {
      case 'customer':
        return <Navigate to="/customer" replace />;
      case 'employee':
        return <Navigate to="/employee" replace />;
      case 'admin':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // If authenticated and role matches (or no role required), render children
  console.log('Authentication and role checks passed, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;