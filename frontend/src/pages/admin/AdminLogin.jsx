import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect location or default to admin dashboard
  const from = location.state?.from || '/admin/dashboard';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Admin login attempt, redirect to:', from);
      
      const result = await login(formData.email, formData.password);
      console.log('🔐 Login result:', result);
      
      if (result.success) {
        console.log('✅ Admin login successful, navigating to:', from);
        
        // Navigate to the intended destination
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed');
        console.error('❌ Admin login failed:', result.error);
      }
    } catch (err) {
      console.error('❌ Admin login error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-white">
          Admin Access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Restricted area - Admin privileges required
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Admin Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-gray-700 text-white"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-gray-700 text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Admin Sign In'}
              </button>
            </div>
          </form>

          {/* Debug Info - Remove in production */}
          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Info:</h4>
            <div className="text-xs space-y-1 text-gray-400">
              <div>Redirect to: <code className="bg-gray-800 px-1 rounded">{from}</code></div>
              <div>Admin token: <code className="bg-gray-800 px-1 rounded">
                {localStorage.getItem('adminToken') ? 'Present' : 'Missing'}
              </code></div>
              <div>Admin user: <code className="bg-gray-800 px-1 rounded">
                {localStorage.getItem('adminUser') ? 'Present' : 'Missing'}
              </code></div>
            </div>
            <button
              onClick={() => {
                console.log('🔍 Current state:', {
                  localStorage: {
                    adminToken: localStorage.getItem('adminToken'),
                    adminUser: localStorage.getItem('adminUser'),
                    token: localStorage.getItem('token'),
                    user: localStorage.getItem('user')
                  },
                  from,
                  formData
                });
              }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Log to console
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Warning</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                Unauthorized access is prohibited and may be subject to legal action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;