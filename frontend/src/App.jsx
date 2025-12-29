import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import Layout from './components/layout/Layout';

import { CartProvider } from './contexts/CartContext';

// Customer Pages
import Homepage from './pages/customer/Homepage';
import Categories from './pages/customer/Categories';
import Subcategories from './pages/customer/Subcategories';
import Conditions from './pages/customer/Conditions';
import ConditionsList from './pages/customer/ConditionsList';
import ProductDetails from './pages/customer/ProductDetails';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/CheckOut';
import CheckoutAddress from './pages/customer/CheckoutAddress';
import MyOrders from './pages/customer/MyOrders';
import MyAccount from './pages/customer/MyAccount';
import Brands from './pages/customer/Brands';
import BrandProducts from './pages/customer/BrandProducts';
import SearchPage from './pages/customer/SearchPage';
import NotificationsPage from './pages/customer/NotificationsPage';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

// Create a simple Notification component here instead of importing
const Notification = () => {
  const [notification, setNotification] = React.useState(null);
  
  React.useEffect(() => {
    const handleShowNotification = (e) => {
      setNotification(e.detail);
      setTimeout(() => setNotification(null), e.detail.duration || 3000);
    };
    
    window.addEventListener('showNotification', handleShowNotification);
    return () => window.removeEventListener('showNotification', handleShowNotification);
  }, []);
  
  if (!notification) return null;
  
  const bgColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm ${bgColors[notification.type] || 'bg-gray-50'} animate-slide-in`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{icons[notification.type] || '💡'}</span>
        <div className="flex-1">
          <div className="font-semibold mb-1">{notification.title}</div>
          <div className="text-sm">{notification.message}</div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Add CSS for notification animation
const notificationStyle = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
`;

// Add style to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = notificationStyle;
  document.head.appendChild(style);
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 
          CUSTOMER ROUTES 
          Wrapped with Customer AuthProvider
          This ensures customer auth doesn't interfere with admin auth
        */}
        <Route path="/*" element={
          <AuthProvider>
            <CartProvider> 
              <Layout>
                <Routes>
                  {/* Home & Navigation */}
                  <Route path="/" element={<Homepage />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/categories/:slug" element={<Subcategories />} />
                  <Route path="/search" element={<SearchPage />} />
                  
                  {/* Conditions/Health Sections */}
                  <Route path="/conditions" element={<ConditionsList />} />
                  <Route path="/conditions/:slug" element={<Conditions />} />
                  
                  {/* Products */}
                  <Route path="/products/:slug" element={<ProductDetails />} />
                  
                  {/* Shopping */}
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/address" element={<CheckoutAddress />} />
                  
                  {/* User Account */}
                  <Route path="/my-orders" element={<MyOrders />} />
                  <Route path="/my-account" element={<MyAccount />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  
                  {/* Brands */}
                  <Route path="/brands" element={<Brands />} />
                  <Route path="/brands/:slug" element={<BrandProducts />} />
                  
                  {/* Auth - Available to all */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Catch-all for customer routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                {/* Add Notification component here */}
                <Notification />
              </Layout>
            </CartProvider>
          </AuthProvider>
        } />
        
        {/* 
          ADMIN ROUTES 
          Completely separate from customer routes
          Wrapped with AdminAuthProvider (uses separate admin_token)
        */}
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <Routes>
              {/* Admin Login */}
              <Route path="/login" element={<AdminLogin />} />
              
              {/* Protected Admin Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                } 
              />
              
              {/* Redirect /admin to /admin/dashboard */}
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              
              {/* Catch-all for admin routes */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AdminAuthProvider>
        } />
        
        {/* 
          GLOBAL REDIRECTS
          These are outside any AuthProvider to avoid mounting issues
        */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;