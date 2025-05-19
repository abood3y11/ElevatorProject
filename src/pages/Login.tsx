import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Handle redirect when authentication state changes
  useEffect(() => {
    console.log('Login component - Auth state:', { isAuthenticated, user, loading });
    
    // Only redirect if we're authenticated, not loading, and have user info
    if (isAuthenticated && !loading && user) {
      console.log('User authenticated with role:', user.role);
      
      // Use timeout to ensure state has settled
      setTimeout(() => {
        // Redirect based on user role
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
            navigate('/dashboard', { replace: true });
        }
      }, 100);
    }
  }, [isAuthenticated, user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Submitting login form for:', email);
      await login(email, password);
      console.log('Login function completed');
    } catch (err) {
      console.error('Login form submission error:', err);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log(`Attempting demo login for role: ${role}`);
      switch (role) {
        case 'employee':
          await login('employee@example.com', 'Employee123!');
          break;
        case 'admin':
          await login('admin@elevatorapp.com', 'Admin123!');
          break;
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Failed to login with demo account');
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <div className="bg-emerald-600 inline-flex p-3 rounded-full shadow-lg mb-3">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Elevator Management System</h2>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow-md rounded-lg">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-center">
              <AlertCircle size={20} className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <Button 
                type="submit" 
                className="w-full flex justify-center bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
          
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Demo Accounts</span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('employee')}
                disabled={isLoading}
                className="border-emerald-900 text-emerald-900"
              >
                Employee
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="border-purple-900 text-purple-900"
              >
                Admin
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;