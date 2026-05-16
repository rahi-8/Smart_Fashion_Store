// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { account } from '../appwrite/config';

interface AuthContextType {
  user: any | null;
  userRole: 'user' | 'admin' | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to get user role from preferences
  const getUserRole = async (): Promise<string> => {
    try {
      const prefs = await account.getPrefs();
      console.log('📦 User preferences:', prefs);
      return prefs?.role || 'user';
    } catch (error) {
      console.log('Error getting user role:', error);
      return 'user';
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = await account.get();
      console.log('✅ Current user:', currentUser.email);
      setUser(currentUser);
      
      const role = await getUserRole();
      console.log('👑 User role:', role);
      setUserRole(role as 'user' | 'admin');
    } catch (error) {
      console.log('No user logged in');
      setUser(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Logging in:', email);
      
      // Create session
      await account.createEmailPasswordSession(email, password);
      
      // Get user details
      const currentUser = await account.get();
      console.log('✅ User logged in:', currentUser.email);
      
      // Get role from preferences
      const role = await getUserRole();
      console.log('👑 User role:', role);
      
      setUser(currentUser);
      setUserRole(role as 'user' | 'admin');
      
      return { success: true, role };
    } catch (error: any) {
      console.log('❌ Login error:', error.message);
      return { success: false, error: error.message };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const newUser = await account.create('unique()', email, password, name);
      
      // Set default preferences for new user
      await account.updatePrefs({
        role: 'user',
        isActive: true,
      });
      console.log('✅ User registered:', email);
      
      // Auto login after registration
      await login(email, password);
      return { success: true, user: newUser };
    } catch (error: any) {
      console.log('❌ Register error:', error.message);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setUserRole(null);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
