// components/admin/OrdersList.jsx
import React, { useState, useEffect } from 'react';
import { adminOrdersAPI } from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  CalendarIcon
} from '@heroicons/react/outline';

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    hasInstructions: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [filters.status, filters.paymentStatus, filters.hasInstructions]);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key] && params[key] !== 0) {
          delete params[key];
        }
      });

      const response = await adminOrdersAPI.getAllOrders(params);
      
      if (response.data.success) {
        setOrders(response.data.data.orders || []);
        setPagination(response.data.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 1
        });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      UNPAID: 'bg-red-100 text-red-800',
      FAILED: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const viewOrderDetails = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={() => {
              setFilters({
                status: '',
                paymentStatus: '',
                hasInstructions: ''
              });
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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

          {/* Payment status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Payments</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Delivery instructions filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Instructions
            </label>
            <select
              value={filters.hasInstructions}
              onChange={(e) => handleFilterChange('hasInstructions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Orders</option>
              <option value="true">With Instructions</option>
              <option value="false">Without Instructions</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end">
            <button
              onClick={() => fetchOrders()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {Object.values(filters).some(f => f) 
              ? "Try changing your filters" 
              : "No orders have been placed yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm">
          {/* Summary Bar */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Showing {orders.length} of {pagination.total} orders
                </span>
                {filters.hasInstructions === 'true' && (
                  <span className="ml-4 text-sm text-purple-600 font-medium">
                    📝 Showing orders with delivery instructions
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <p className="font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </p>
                        {getStatusBadge(order.status)}
                        {getPaymentBadge(order.paymentStatus)}
                        {order.deliveryInstructions && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <DocumentTextIcon className="h-3 w-3 mr-1" />
                            Has Instructions
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.items?.length || 0} items
                        </p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        {order.user?.name || 'Customer'} • {order.user?.email}
                        {order.contactPhone && ` • ${order.contactPhone}`}
                      </p>
                    </div>

                    {/* Delivery Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="flex items-start">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {order.address?.street}, {order.address?.city}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.address?.state}, {order.address?.zipCode}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {formatDate(order.createdAt)}
                          </p>
                          {order.shippingMethod && (
                            <p className="text-xs text-gray-500">
                              {order.shippingMethod}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Instructions Preview */}
                    {order.deliveryInstructions && (
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-purple-700">
                            DELIVERY INSTRUCTIONS:
                          </span>
                          <span className="text-xs text-purple-600">
                            {order.deliveryInstructions.length} characters
                          </span>
                        </div>
                        <p className="text-sm text-purple-800 line-clamp-2">
                          {order.deliveryInstructions}
                        </p>
                      </div>
                    )}

                    {/* Items Preview */}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          Items: {order.items.slice(0, 3).map(item => 
                            `${item.product?.name} (${item.quantity})`
                          ).join(', ')}
                          {order.items.length > 3 && ` +${order.items.length - 3} more`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => viewOrderDetails(order.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchOrders(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchOrders(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                        .filter(page => 
                          page === 1 || 
                          page === pagination.pages || 
                          (page >= pagination.page - 2 && page <= pagination.page + 2)
                        )
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && page - array[index - 1] > 1;
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => fetchOrders(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  page === pagination.page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersList;