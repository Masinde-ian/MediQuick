// contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { authAPI, setAuthHeader } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const authCheckInProgress = useRef(false);

  const checkAuth = useCallback(async () => {
    if (authCheckInProgress.current) {
      console.log('🔐 Auth check already in progress, skipping...');
      return;
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('🔐 No token found');
      setAuthHeader(null);
      setLoading(false);
      setAuthChecked(true);
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    try {
      authCheckInProgress.current = true;
      console.log('🔐 Starting auth check...');
      
      // Set header BEFORE making the API call
      setAuthHeader(token);
      
      const response = await authAPI.getProfile();
      
      // Fast user extraction
      const finalUser = response.data?.user || response.data?.data?.user || response.data?.data || response.data;
      
      if (finalUser?.id) {
        setUser(finalUser);
        setIsAuthenticated(true);
        console.log('🔐 Auth successful:', finalUser.id);
      } else {
        throw new Error('Invalid user data');
      }
    } catch (error) {
      console.log('🔐 Auth check failed:', error);
      
      // Clear token on auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Auth error - clearing token and header');
        localStorage.removeItem('token');
        setAuthHeader(null);
      }
      
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      setAuthChecked(true);
      authCheckInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    console.log('🔐 AuthProvider mounted, starting auth check');
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const responseData = response.data?.data || response.data;
      const { token, user } = responseData;
      
      if (token && user?.id) {
        localStorage.setItem('token', token);
        
        // Set header immediately after successful login
        setAuthHeader(token);
        
        const finalUser = user.user || user;
        setUser(finalUser);
        setIsAuthenticated(true);
        setAuthChecked(true);
        
        console.log('🔐 Login successful, user ID:', finalUser.id);
        return { success: true, user: finalUser };
      }
      throw new Error('Invalid response data');
    } catch (error) {
      console.error('🔐 Login failed:', error);
      setAuthHeader(null);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  };

  const logout = () => {
    console.log('🔐 Logging out user');
    localStorage.removeItem('token');
    setAuthHeader(null);
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    window.location.href = '/';
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    authChecked,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};