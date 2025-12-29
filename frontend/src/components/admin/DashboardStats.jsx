// components/admin/DashboardStats.jsx
import React, { useState, useEffect } from 'react';
import { adminAnalyticsAPI, adminOrdersAPI } from '../../services/adminApi';
import { Link } from 'react-router-dom';
import {
  ShoppingBagIcon,
  CurrencyRupeeIcon,
  UsersIcon,
  PackageIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/outline';

const DashboardStats = () => {
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
      const statsResponse = await adminAnalyticsAPI.getDashboardStats();
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data.stats);
      }

      // Fetch recent orders
      const ordersResponse = await adminOrdersAPI.getAllOrders({ limit: 5 });
      if (ordersResponse.data.success) {
        setRecentOrders(ordersResponse.data.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
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
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ₹{stats.totalRevenue?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-3xl text-green-600">
                <CurrencyRupeeIcon className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.totalOrders?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-3xl text-blue-600">
                <ShoppingBagIcon className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.totalProducts?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-3xl text-purple-600">
                <PackageIcon className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Orders with Instructions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders with Instructions</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.ordersWithDeliveryInstructions || 0}
                </p>
              </div>
              <div className="text-3xl text-indigo-600">
                <DocumentTextIcon className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders with Instructions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Orders with Delivery Instructions
            </h3>
            <Link
              to="/admin/dashboard?tab=orders&hasInstructions=true"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              View all <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        {recentOrders.filter(order => order.deliveryInstructions).length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders with instructions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Recent orders don't have delivery instructions
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentOrders
              .filter(order => order.deliveryInstructions)
              .slice(0, 5)
              .map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          Instructions
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {order.user?.name} • {formatCurrency(order.totalAmount)}
                      </p>
                      
                      {/* Delivery Instructions Preview */}
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
                        <p className="text-sm text-purple-800 line-clamp-2">
                          {order.deliveryInstructions}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      className="ml-4 text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/dashboard?tab=orders&status=PENDING"
          className="flex items-center justify-between p-6 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
        >
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Process Pending Orders
              </h4>
              <p className="text-xs text-yellow-600 mt-1">
                {stats?.pendingOrders || 0} orders need attention
              </p>
            </div>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-yellow-600" />
        </Link>
        
        <Link
          to="/admin/dashboard?tab=orders&hasInstructions=true"
          className="flex items-center justify-between p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
        >
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-purple-800">
                Review Orders with Instructions
              </h4>
              <p className="text-xs text-purple-600 mt-1">
                {stats?.ordersWithDeliveryInstructions || 0} orders have special instructions
              </p>
            </div>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-purple-600" />
        </Link>
        
        <Link
          to="/admin/dashboard?tab=inventory"
          className="flex items-center justify-between p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
        >
          <div className="flex items-center">
            <PackageIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Check Low Stock
              </h4>
              <p className="text-xs text-red-600 mt-1">
                {stats?.lowStockProducts || 0} products need restocking
              </p>
            </div>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-red-600" />
        </Link>
      </div>
    </div>
  );
};

export default DashboardStats;