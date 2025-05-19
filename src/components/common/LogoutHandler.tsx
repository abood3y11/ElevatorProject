// components/common/LogoutHandler.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LogoutHandler: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleLogout = async () => {
      try {
        await logout();
        navigate('/login', { replace: true, state: { justLoggedOut: true } });
      } catch (error) {
        console.error('Logout failed:', error);
        navigate('/login', { replace: true });
      }
    };
    
    handleLogout();
  }, [logout, navigate]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-600">Signing out...</p>
    </div>
  );
};

export default LogoutHandler;