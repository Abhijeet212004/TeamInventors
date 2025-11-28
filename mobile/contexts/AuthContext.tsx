import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: string;
  qrCode?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await authAPI.isAuthenticated();
      if (isAuth) {
        const currentUser = await authAPI.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone: string, email: string) => {
    await authAPI.sendOTP(phone, email);
  };

  const login = async (userData: User) => {
    setUser(userData);
  };

  const register = async (data: { phone: string; name: string; email?: string }) => {
    const response = await authAPI.register(data);
    setUser(response.user);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
