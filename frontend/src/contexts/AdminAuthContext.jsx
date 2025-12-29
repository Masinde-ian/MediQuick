import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setAuthHeader } from '../services/api';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const authCheckInProgress = useRef(false);
  const navigate = useNavigate();

  // Use SEPARATE keys for admin authentication
  const ADMIN_TOKEN_KEY = 'adminToken';
  const ADMIN_USER_KEY = 'adminUser';

  useEffect(() => {
    console.log('👑 AdminAuthProvider mounted, starting auth check');
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    if (authCheckInProgress.current) {
      console.log('👑 Admin auth check already in progress, skipping...');
      return;
    }

    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const storedUser = localStorage.getItem(ADMIN_USER_KEY);
    
    console.log('🔍 Admin auth check:', {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenLength: token?.length,
      token: token ? token.substring(0, 20) + '...' : 'none'
    });

    if (!token || !storedUser) {
      console.log('👑 No admin token or user found in localStorage');
      setLoading(false);
      setAuthChecked(true);
      setAdmin(null);
      return;
    }

    try {
      authCheckInProgress.current = true;
      console.log('👑 Starting admin auth check with stored token...');
      
      // Set the admin token for this request
      const originalToken = localStorage.getItem('token');
      setAuthHeader(token);
      
      // Try to get user profile with admin token
      const response = await authAPI.getProfile();
      
      // Restore original token if it exists
      if (originalToken) {
        setAuthHeader(originalToken);
      } else {
        setAuthHeader(null);
      }
      
      // Parse response
      const user = response.data?.user || response.data?.data?.user || response.data?.data || response.data;
      console.log('👑 Profile response:', {
        userId: user?.id,
        userRole: user?.role,
        userEmail: user?.email
      });
      
      // STRICT admin role check
      if (user?.id && user?.role && user.role.toUpperCase() === 'ADMIN') {
        console.log('✅ User is verified as admin');
        setAdmin(user);
        
        // Update stored user info
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      } else {
        console.log('❌ User is not an admin, role:', user?.role);
        logout();
      }
    } catch (error) {
      console.log('❌ Admin auth check failed:', error.response?.status, error.message);
      
      // Check for specific error types
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔒 Token expired or invalid');
        logout();
      }
      
      setAdmin(null);
    } finally {
      setLoading(false);
      setAuthChecked(true);
      authCheckInProgress.current = false;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('👑 Admin login attempt for:', email);
      
      // Use regular login endpoint (should work for both admin and customer)
      const response = await authAPI.login({ email, password });
      console.log('👑 Login response:', response.data);
      
      const { token, user } = response.data?.data || response.data;
      
      if (!token || !user) {
        console.log('❌ No token or user in response');
        return { 
          success: false, 
          error: 'Invalid login response' 
        };
      }
      
      // DEBUG: Check user data
      console.log('👑 User data from login:', {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      });
      
      // Check if user has admin role BEFORE storing token
      if (!user?.role || user.role.toUpperCase() !== 'ADMIN') {
        console.log('❌ Login failed: User is not an admin, role:', user?.role);
        return { 
          success: false, 
          error: 'Access denied. Admin privileges required.' 
        };
      }
      
      // Store admin token and user separately
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      
      // IMPORTANT: Set auth header immediately
      setAuthHeader(token);
      
      // Update state
      setAdmin(user);
      
      console.log('✅ Admin login successful:', {
        email: user.email,
        role: user.role,
        tokenStored: !!localStorage.getItem(ADMIN_TOKEN_KEY),
        userStored: !!localStorage.getItem(ADMIN_USER_KEY)
      });
      
      return { success: true, user };
    } catch (error) {
      console.error('❌ Admin login error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.message || 
                         'Login failed';
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const logout = () => {
    console.log('👑 Admin logging out');
    
    // Only remove admin tokens
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    
    // Clear auth header
    setAuthHeader(null);
    
    // Update state
    setAdmin(null);
    
    // Navigate to admin login page
    navigate('/admin/login');
    
    console.log('👑 Admin logout complete');
  };

  const value = {
    admin,
    login,
    logout,
    loading,
    authChecked
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};