// components/admin/OrdersDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  SearchIcon,
  FilterIcon,
  EyeIcon,
  ReceiptRefundIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhoneIcon
} from '@heroicons/react/outline';

export default function OrdersDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    search: '',
    startDate: '',
    endDate: '',
    hasInstructions: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  // Status colors mapping
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-purple-100 text-purple-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  const paymentStatusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    UNPAID: 'bg-red-100 text-red-800',
    FAILED: 'bg-gray-100 text-gray-800'
  };

  // Fetch orders
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

      const response = await api.get('/orders/admin/all', { params });
      
      if (response.data.success) {
        setOrders(response.data.data.orders);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get('/orders/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filters.status, filters.paymentStatus, filters.hasInstructions]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(1);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Get status badge
  const StatusBadge = ({ status }) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );

  // Get payment status badge
  const PaymentBadge = ({ status }) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );

  // View order details
  const viewOrderDetails = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  // Stats cards
  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend = null }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md bg-${color}-500 p-3`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-semibold text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Orders Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage customer orders with delivery instructions
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ReceiptRefundIcon}
            color="blue"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={ClockIcon}
            color="yellow"
          />
          <StatCard
            title="With Instructions"
            value={`${stats.ordersWithDeliveryInstructions} (${stats.percentageWithInstructions}%)`}
            icon={DocumentTextIcon}
            color="purple"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={() => {
              setFilters({
                status: '',
                paymentStatus: '',
                search: '',
                startDate: '',
                endDate: '',
                hasInstructions: ''
              });
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Orders</option>
                <option value="true">With Instructions</option>
                <option value="false">Without Instructions</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Search orders
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by order number, customer name, email, or instructions..."
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              type="submit"
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptRefundIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(f => f) 
                ? "Try changing your filters" 
                : "No orders have been placed yet"}
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {orders.map((order) => (
                <li key={order.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600 truncate">
                              Order #{order.orderNumber}
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.customer?.name || 'Customer'} • {order.customer?.email}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={order.status} />
                            <PaymentBadge status={order.paymentStatus} />
                          </div>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {/* Order Info */}
                          <div className="text-sm">
                            <p className="text-gray-900 font-medium">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <p className="text-gray-500">
                              {order.items?.length || 0} items
                            </p>
                          </div>

                          {/* Delivery Info */}
                          <div className="text-sm">
                            {order.hasDeliveryInstructions ? (
                              <div className="flex items-center text-purple-600">
                                <DocumentTextIcon className="h-4 w-4 mr-1" />
                                <span className="font-medium">Has Delivery Instructions</span>
                              </div>
                            ) : (
                              <p className="text-gray-500">No delivery instructions</p>
                            )}
                            <p className="text-gray-500">
                              <MapPinIcon className="h-4 w-4 inline mr-1" />
                              {order.shippingAddress?.city || 'N/A'}
                            </p>
                          </div>

                          {/* Contact Info */}
                          <div className="text-sm">
                            {order.contactPhone && (
                              <p className="text-gray-500">
                                <PhoneIcon className="h-4 w-4 inline mr-1" />
                                {order.contactPhone}
                              </p>
                            )}
                            <p className="text-gray-500">
                              {formatDate(order.createdAt)}
                            </p>
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
                                {order.instructionsLength || order.deliveryInstructions.length} characters
                              </span>
                            </div>
                            <p className="text-sm text-purple-800 line-clamp-2">
                              {order.deliveryInstructions}
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
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                          // Add ellipsis for gaps
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
            )}
          </>
        )}
      </div>
    </div>
  );
}