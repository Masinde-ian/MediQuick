import React, { useState, useMemo, useCallback } from 'react';
import { adminOrdersAPI } from '../../services/adminApi';

// Lazy load icons
const DocumentTextIcon = React.lazy(() => import('@heroicons/react/24/outline').then(module => ({ default: module.DocumentTextIcon })));
const MapPinIcon = React.lazy(() => import('@heroicons/react/24/outline').then(module => ({ default: module.MapPinIcon })));
const CalendarIcon = React.lazy(() => import('@heroicons/react/24/outline').then(module => ({ default: module.CalendarIcon })));

const OrdersTab = React.memo(({
  orders = [], // Add default value
  loading,
  orderFilters,
  setOrderFilters,
  refreshOrders,
  formatDate,
  formatCurrency,
  showNotification
}) => {
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // Handle status update
  const handleStatusUpdate = useCallback(async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      await adminOrdersAPI.updateOrderStatus(orderId, { status: newStatus });
      await refreshOrders();
      showNotification('success', 'Updated', 'Order status updated');
    } catch (error) {
      showNotification('error', 'Error', error.message || 'Failed to update');
    } finally {
      setUpdatingOrder(null);
    }
  }, [refreshOrders, showNotification]);

  // Filter orders client-side (minimal) with safe access
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
      if (!order || typeof order !== 'object') return false;
      
      const status = order.status || 'PENDING';
      const hasInstructions = !!order.deliveryInstructions;
      
      if (orderFilters.status && status !== orderFilters.status) return false;
      if (orderFilters.hasInstructions === 'true' && !hasInstructions) return false;
      if (orderFilters.hasInstructions === 'false' && hasInstructions) return false;
      return true;
    });
  }, [orders, orderFilters]);

  // Helper function to get safe values
  const getSafeValue = (obj, path, defaultValue = '') => {
    try {
      const keys = path.split('.');
      let result = obj;
      for (const key of keys) {
        result = result?.[key];
        if (result === undefined || result === null) return defaultValue;
      }
      return result;
    } catch {
      return defaultValue;
    }
  };

  // Order row component with safe property access
  const OrderRow = React.memo(({ order }) => {
    // Safely extract all properties with defaults
    const orderNumber = getSafeValue(order, 'orderNumber', 'N/A');
    const orderStatus = getSafeValue(order, 'status', 'PENDING');
    const userName = getSafeValue(order, 'user.name', 'Customer');
    const userEmail = getSafeValue(order, 'user.email', '');
    const contactPhone = getSafeValue(order, 'contactPhone', '');
    const street = getSafeValue(order, 'address.street', '');
    const city = getSafeValue(order, 'address.city', '');
    const state = getSafeValue(order, 'address.state', '');
    const zipCode = getSafeValue(order, 'address.zipCode', '');
    const createdAt = getSafeValue(order, 'createdAt', new Date().toISOString());
    const totalAmount = getSafeValue(order, 'totalAmount', 0);
    const itemsCount = Array.isArray(order?.items) ? order.items.length : 0;
    const deliveryInstructions = getSafeValue(order, 'deliveryInstructions', '');
    const orderId = getSafeValue(order, 'id', '');

    const hasAddress = street || city || state || zipCode;
    const hasUserInfo = userName || userEmail;

    return (
      <div className="bg-white rounded border p-4 mb-3 hover:shadow-sm transition-shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Order header */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                Order #{orderNumber}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                orderStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {orderStatus || 'PENDING'}
              </span>
              {deliveryInstructions && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <React.Suspense fallback={<div className="h-3 w-3 mr-1 bg-purple-200 rounded" />}>
                    <DocumentTextIcon className="h-3 w-3 mr-1" />
                  </React.Suspense>
                  Instructions
                </span>
              )}
            </div>

            {/* Customer info */}
            {hasUserInfo && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  {userName !== 'Customer' ? `${userName} • ${userEmail}` : userEmail || 'Customer'}
                </p>
                {contactPhone && (
                  <p className="text-sm text-gray-600">Phone: {contactPhone}</p>
                )}
              </div>
            )}

            {/* Address info */}
            {hasAddress && (
              <div className="flex items-start gap-2 mb-3">
                <React.Suspense fallback={<div className="h-4 w-4 mt-0.5 bg-gray-200 rounded" />}>
                  <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                </React.Suspense>
                <div className="text-sm">
                  <p className="text-gray-900">
                    {street && `${street}, `}{city}
                  </p>
                  {(state || zipCode) && (
                    <p className="text-gray-600">
                      {state}{zipCode && `, ${zipCode}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Order details */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <React.Suspense fallback={<div className="h-4 w-4 bg-gray-200 rounded" />}>
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </React.Suspense>
                <span className="text-gray-600">{formatDate(createdAt)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">{formatCurrency(totalAmount)}</span>
                <span className="text-gray-600 ml-2">• {itemsCount} items</span>
              </div>
            </div>

            {/* Delivery instructions */}
            {deliveryInstructions && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded">
                <p className="text-xs font-medium text-purple-700 mb-1">Delivery Instructions:</p>
                <p className="text-sm text-purple-800">{deliveryInstructions}</p>
              </div>
            )}
          </div>

          {/* Status update - only show if we have an order ID */}
          {orderId && (
            <div className="md:w-48 flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
              <select
                value={orderStatus}
                onChange={(e) => handleStatusUpdate(orderId, e.target.value)}
                disabled={updatingOrder === orderId}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {updatingOrder === orderId && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="animate-spin h-3 w-3 border-b-2 border-blue-600 rounded-full"></div>
                  <span className="text-xs text-gray-500">Updating...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  });

  OrderRow.displayName = 'OrderRow';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Orders</h2>
          <p className="text-sm text-gray-600">
            Showing {filteredOrders.length} of {(orders || []).length} orders
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshOrders}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={orderFilters?.status || ''}
              onChange={(e) => setOrderFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <select
              value={orderFilters?.hasInstructions || ''}
              onChange={(e) => setOrderFilters(prev => ({ ...prev, hasInstructions: e.target.value }))}
              className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Orders</option>
              <option value="true">With Instructions</option>
              <option value="false">Without Instructions</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={refreshOrders}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => setOrderFilters({ status: '', hasInstructions: '' })}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="bg-white rounded shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {(orderFilters?.status || orderFilters?.hasInstructions) 
              ? "Try changing your filters" 
              : "No orders have been placed yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, index) => (
            <OrderRow key={order?.id || `order-${index}`} order={order} />
          ))}
        </div>
      )}
    </div>
  );
});

OrdersTab.displayName = 'OrdersTab';

export default OrdersTab;