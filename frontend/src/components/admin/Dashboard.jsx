// components/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import {
  ShoppingCartIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationIcon
} from '@heroicons/react/outline';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await api.get('/orders/admin/stats');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Fetch recent orders
      const ordersResponse = await api.get('/orders/admin/recent');
      if (ordersResponse.data.success) {
        setRecentOrders(ordersResponse.data.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, Admin!</h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Orders */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Orders
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.totalOrders}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm">
                  <span className="text-green-600 font-medium">
                    {stats.todaysOrders} today
                  </span>
                  <span className="text-gray-500 ml-2">
                    {stats.monthlyOrders} this month
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatCurrency(stats.totalRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm">
                  <span className="text-green-600 font-medium">
                    {formatCurrency(stats.recentRevenue)} last 30 days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Orders
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.pendingOrders}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm">
                  <span className="text-yellow-600 font-medium">
                    Needs attention
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders with Instructions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      With Instructions
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.ordersWithDeliveryInstructions}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm">
                  <span className="text-purple-600 font-medium">
                    {stats.percentageWithInstructions}% of orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Orders
            </h3>
            <Link
              to="/admin/orders"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {recentOrders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <Link to={`/admin/orders/${order.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          #{order.orderNumber}
                        </p>
                        {order.isNew && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                        {order.hasDeliveryInstructions && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <DocumentTextIcon className="h-3 w-3 mr-1" />
                            Instructions
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {order.customerName} • {order.items}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <p className={`text-xs ${
                          order.status === 'PENDING' ? 'text-yellow-600' :
                          order.status === 'DELIVERED' ? 'text-green-600' :
                          'text-gray-500'
                        }`}>
                          {order.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Instructions Preview */}
                  {order.deliveryInstructions && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded">
                      <p className="text-xs text-purple-700 line-clamp-1">
                        📝 {order.deliveryInstructions}
                      </p>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Orders by Status */}
        {stats?.ordersByStatus && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Orders by Status
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{status}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders by Payment Method */}
        {stats?.ordersByPaymentMethod && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Payment Methods
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.ordersByPaymentMethod).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{method}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Needing Attention */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link
              to="/admin/orders?status=PENDING"
              className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
            >
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-yellow-800">
                  Process Pending Orders
                </span>
              </div>
              <span className="text-sm text-yellow-600">→</span>
            </Link>
            
            <Link
              to="/admin/orders?hasInstructions=true"
              className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
            >
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-purple-800">
                  Review Orders with Instructions
                </span>
              </div>
              <span className="text-sm text-purple-600">→</span>
            </Link>
            
            <Link
              to="/admin/orders?paymentStatus=UNPAID"
              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <div className="flex items-center">
                <ExclamationIcon className="h-5 w-5 text-red-600 mr-3" />
                <span className="text-sm font-medium text-red-800">
                  Follow up Unpaid Orders
                </span>
              </div>
              <span className="text-sm text-red-600">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}