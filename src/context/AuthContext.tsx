import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'employee' | 'admin';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  position?: string;
  joinDate?: string;
  lastActive?: string;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const authStateSubscription = useRef<any>(null);

  // Function to get user role from auth user
  const getUserRoleFromMetadata = (authUser: User): UserRole => {
    // Check app_metadata first as it's more authoritative
    if (authUser.app_metadata?.role) {
      return authUser.app_metadata.role as UserRole;
    }
    
    // Then check user_metadata
    if (authUser.user_metadata?.role) {
      return authUser.user_metadata.role as UserRole;
    }
    
    // Finally check raw metadata if available
    if (authUser.raw_app_meta_data?.role) {
      return authUser.raw_app_meta_data.role as UserRole;
    }
    
    if (authUser.raw_user_meta_data?.role) {
      return authUser.raw_user_meta_data.role as UserRole;
    }
    
    // Default to customer if no role found
    return 'customer';
  };

  // Create user profile from auth user
  const createProfileFromAuthUser = (authUser: User): Profile => {
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || 'User',
      email: authUser.email || '',
      role: getUserRoleFromMetadata(authUser),
      lastActive: authUser.last_sign_in_at
    };
  };

  useEffect(() => {
    console.log('AuthProvider initializing');
    
    // Setup auth state
    const setupAuth = async () => {
      try {
        // First, get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setLoading(false);
          return;
        }
        
        // Set up the user if we have a session
        if (sessionData?.session?.user) {
          const authUser = sessionData.session.user;
          console.log('Found user in session:', authUser.id);
          
          // Create profile from auth user
          const profile = createProfileFromAuthUser(authUser);
          setUser(profile);
        }
        
        // Always set loading to false after initial setup
        setLoading(false);
        
        // Set up auth state change listener
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change event:', event);
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in:', session.user.id);
            const profile = createProfileFromAuthUser(session.user);
            setUser(profile);
            // Important: Set loading to false here as well
            setLoading(false);
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            setUser(null);
            setLoading(false);
          }
        });
        
        // Store subscription reference
        authStateSubscription.current = data.subscription;
        
      } catch (error) {
        console.error('Error setting up auth:', error);
        setLoading(false);
      }
    };
    
    setupAuth();
    
    // Clean up subscription on unmount
    return () => {
      if (authStateSubscription.current) {
        authStateSubscription.current.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('Attempting login for:', email);
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (error) {
        console.error('Login error:', error);
        setLoading(false);
        throw error;
      }
      
      console.log('Login successful, auth response received');
      
      // Set loading to false after successful login
      setLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      throw error;
    }
  };
  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log('Logging out user');
      
      // Set user to null immediately to prevent redirects
      setUser(null);
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);