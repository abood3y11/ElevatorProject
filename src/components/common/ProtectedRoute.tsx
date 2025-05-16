import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: UserRole | UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Show loading indicator while checking authentication
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has the required role
  const requiredRoles = Array.isArray(role) ? role : [role];
  const hasRequiredRole = user && requiredRoles.includes(user.role);
  
  if (!hasRequiredRole) {
    // Redirect to appropriate dashboard based on actual role
    if (user?.role === 'customer') {
      return <Navigate to="/customer" replace />;
    } else if (user?.role === 'employee') {
      return <Navigate to="/employee" replace />;
    } else if (user?.role === 'management') {
      return <Navigate to="/admin" replace />;
    }
    
    // Fallback to login if role is unrecognized
    return <Navigate to="/login" replace />;
  }
  
  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;