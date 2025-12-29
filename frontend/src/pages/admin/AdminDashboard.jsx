import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { 
  adminAnalyticsAPI, 
  adminInventoryAPI,
  adminOrdersAPI,
  adminUsersAPI,
  generalAPI 
} from '../../services/adminApi';
import { useNavigate, useLocation } from 'react-router-dom';
import InventoryTab from './InventoryTab';
import OrdersTab from './OrdersTab';
import UsersTab from './UsersTab';
import EditProductModal from './EditProductModal';

const AdminDashboard = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get active tab from URL
  const query = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(query.get('tab') || 'dashboard');
  
  // Data states
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    outOfStockProducts: 0,
    ordersWithInstructions: 0,
    percentageWithInstructions: 0
  });
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [prescriptionFilter, setPrescriptionFilter] = useState('all');
  
  // Order filters
  const [orderFilters, setOrderFilters] = useState({
    status: '',
    hasInstructions: ''
  });
  
  // User filters
  const [userFilters, setUserFilters] = useState({
    role: 'all',
    status: 'all'
  });
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Load data when tab changes
  useEffect(() => {
    const tab = query.get('tab') || 'dashboard';
    setActiveTab(tab);
    
    if (tab === 'inventory') {
      fetchProducts();
      fetchCategoriesAndBrands();
    } else if (tab === 'dashboard') {
      fetchDashboardStats();
    } else if (tab === 'orders') {
      fetchOrders();
    } else if (tab === 'users') {
      fetchUsers();
    }
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/dashboard?tab=${tab}`);
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await adminAnalyticsAPI.getDashboardStats();
      if (response.data?.data?.stats) {
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      showNotification('error', 'Error', 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchQuery,
        outOfStock: stockFilter === 'outOfStock' ? 'true' : undefined
      };
      
      const response = await adminInventoryAPI.getAllProducts(params);
      if (response.data?.data?.products) {
        setProducts(response.data.data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('error', 'Error', 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await adminOrdersAPI.getAllOrders();
      if (response.data?.data?.orders) {
        setOrders(response.data.data.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      showNotification('error', 'Error', 'Failed to load orders');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await adminUsersAPI.getAllUsers();
      if (response.data?.data?.users) {
        setUsers(response.data.data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('error', 'Error', 'Failed to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCategoriesAndBrands = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        generalAPI.getCategories(),
        generalAPI.getBrands()
      ]);
      
      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.data || []);
      }
      if (brandsRes.data?.success) {
        setBrands(brandsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error loading categories/brands:', error);
      showNotification('error', 'Error', 'Failed to load categories/brands');
    }
  };

  // Product actions
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Update existing product
        await adminInventoryAPI.updateProduct(editingProduct.id, productData);
        showNotification('success', 'Success', 'Product updated successfully');
      } else {
        // Create new product
        await adminInventoryAPI.createProduct(productData);
        showNotification('success', 'Success', 'Product created successfully');
      }
      
      // Refresh products
      await fetchProducts();
      
      // Close modals
      setShowEditModal(false);
      setShowAddModal(false);
      setEditingProduct(null);
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to save product';
      showNotification('error', 'Error', errorMsg);
      throw error;
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await adminInventoryAPI.deleteProduct(productId);
        await fetchProducts();
        showNotification('success', 'Success', 'Product deleted successfully');
      } catch (error) {
        showNotification('error', 'Error', 'Failed to delete product');
      }
    }
  };

  const handleToggleStock = async (productId, currentStatus) => {
    try {
      await adminInventoryAPI.updateStock(productId, { inStock: !currentStatus });
      await fetchProducts();
      showNotification('success', 'Success', `Product marked as ${!currentStatus ? 'in stock' : 'out of stock'}`);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to update stock status');
    }
  };

  // Order actions
  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await adminOrdersAPI.updateOrderStatus(orderId, { status });
      await fetchOrders();
      showNotification('success', 'Success', `Order status updated to ${status}`);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to update order status');
    }
  };

  // User actions
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await adminUsersAPI.updateUser(userId, { role: newRole });
      await fetchUsers();
      showNotification('success', 'Success', `User role updated to ${newRole}`);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await adminUsersAPI.updateUser(userId, { isActive: !currentStatus });
      await fetchUsers();
      showNotification('success', 'Success', `User ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to update user status');
    }
  };

  const showNotification = (type, title, message) => {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.admin-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `admin-notification fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-100 text-green-800 border-green-200' :
      type === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
      'bg-blue-100 text-blue-800 border-blue-200'
    } border`;
    notification.innerHTML = `
      <div class="font-semibold">${title}</div>
      <div class="text-sm">${message}</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'KSh 0';
    return `KSh ${Number(amount).toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                ADMIN
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {admin?.name || 'Admin'}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Admin Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
          <nav className="flex flex-wrap gap-4">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => handleTabChange('inventory')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              📦 Inventory
            </button>
            <button
              onClick={() => handleTabChange('orders')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              🛒 Orders
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              👥 Users
            </button>
          </nav>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="text-3xl text-green-600">💰</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {stats.totalOrders?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-3xl text-blue-600">📦</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Orders with Instructions</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {stats.ordersWithInstructions || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.percentageWithInstructions || 0}% of all orders
                    </p>
                  </div>
                  <div className="text-3xl text-purple-600">📝</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {stats.outOfStockProducts?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-3xl text-red-600">⚠️</div>
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Orders */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
                  <button 
                    onClick={() => handleTabChange('orders')}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {orders.slice(0, 5).map(order => (
                    <div key={order?.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order?.orderNumber || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{order?.user?.name || 'Customer'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(order?.totalAmount)}
                        </span>
                        <span className={`block text-xs px-2 py-1 rounded-full ${
                          order?.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          order?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order?.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No recent orders</p>
                  )}
                </div>
              </div>

              {/* Low Stock Products */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Low Stock Products</h3>
                  <button 
                    onClick={() => handleTabChange('inventory')}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {products
                    .filter(product => !product?.inStock)
                    .slice(0, 5)
                    .map(product => (
                      <div key={product?.id} className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={typeof product?.images === 'string' ? JSON.parse(product.images)?.[0] : product?.images?.[0] || '/placeholder.jpg'}
                            alt={product?.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{product?.name || 'Unnamed Product'}</p>
                            <p className="text-sm text-gray-500">{product?.sku || 'No SKU'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Out of Stock
                        </span>
                      </div>
                    ))}
                  {products.filter(product => !product?.inStock).length === 0 && (
                    <p className="text-gray-500 text-center py-4">All products are in stock</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            products={products}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            prescriptionFilter={prescriptionFilter}
            setPrescriptionFilter={setPrescriptionFilter}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onToggleStock={handleToggleStock}
            onAddProduct={() => {
              setEditingProduct(null);
              setShowAddModal(true);
            }}
            onRefresh={fetchProducts}
            categories={categories}
            brands={brands}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            loading={ordersLoading}
            orderFilters={orderFilters}
            setOrderFilters={setOrderFilters}
            refreshOrders={fetchOrders}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            showNotification={showNotification}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            users={users}
            loading={usersLoading}
            userFilters={userFilters}
            setUserFilters={setUserFilters}
            refreshUsers={fetchUsers}
            formatDate={formatDate}
            onUpdateUserRole={handleUpdateUserRole}
            onToggleUserStatus={handleToggleUserStatus}
            showNotification={showNotification}
          />
        )}
      </div>

      {/* Edit Product Modal */}
      {(showEditModal || showAddModal) && (
        <EditProductModal
          isOpen={showEditModal || showAddModal}
          onClose={() => {
            setShowEditModal(false);
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          product={editingProduct}
          categories={categories}
          brands={brands}
        />
      )}
    </div>
  );
};

export default AdminDashboard;