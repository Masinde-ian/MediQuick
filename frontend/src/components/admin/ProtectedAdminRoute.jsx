import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const ProtectedAdminRoute = ({ children }) => {
  const { admin, loading, authChecked } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔒 ProtectedAdminRoute check:', {
      admin: !!admin,
      loading,
      authChecked,
      adminId: admin?.id,
      adminRole: admin?.role,
      currentPath: location.pathname
    });

    // Only redirect when we've finished checking auth and no admin
    if (!loading && authChecked && !admin) {
      console.log('🔒 No admin, redirecting to login');
      
      // Save the current location to return to after login
      navigate('/admin/login', {
        state: { 
          from: location.pathname + location.search,
          message: 'Please login as admin to access this page'
        },
        replace: true
      });
    }
  }, [admin, loading, authChecked, navigate, location]);

  // Show loading while checking auth
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin privileges...</p>
        </div>
      </div>
    );
  }

  // Render children if admin is authenticated
  return admin ? children : null;
};

export default ProtectedAdminRoute;