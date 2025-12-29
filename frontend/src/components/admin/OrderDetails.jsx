// components/admin/OrderDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminOrdersAPI } from '../../services/adminApi';
import {
  ArrowLeftIcon,
  PencilIcon,
  SaveIcon,
  XIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CurrencyRupeeIcon,
  TruckIcon
} from '@heroicons/react/outline';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    deliveryInstructions: '',
    status: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminOrdersAPI.getOrder(orderId);
      
      if (response.data.success) {
        const orderData = response.data.data.order;
        setOrder(orderData);
        setFormData({
          deliveryInstructions: orderData.deliveryInstructions || '',
          status: orderData.status,
          notes: orderData.notes || ''
        });
      } else {
        setError(response.data.error || 'Failed to fetch order');
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      setError(error.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    try {
      setUpdating(true);
      const updateData = {
        ...formData,
        deliveryInstructions: formData.deliveryInstructions.trim() || null
      };

      const response = await adminOrdersAPI.updateOrderStatus(orderId, updateData);
      
      if (response.data.success) {
        setOrder(prev => ({
          ...prev,
          ...response.data.data.order
        }));
        setEditMode(false);
        alert('Order updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      alert(error.response?.data?.error || 'Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      deliveryInstructions: order?.deliveryInstructions || '',
      status: order?.status || '',
      notes: order?.notes || ''
    });
    setEditMode(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Order</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600 mt-1">Placed on {formatDate(order.createdAt)}</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-3">
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Order
                </button>
              )}
              {editMode && (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateOrder}
                    disabled={updating}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status</h3>
                {editMode ? (
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'SHIPPED' ? 'bg-indigo-100 text-indigo-800' :
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Status</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    order.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'UNPAID' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                  <span className="text-sm text-gray-500">
                    {order.paymentMethod === 'MPESA' ? 'M-Pesa' : 'Cash on Delivery'}
                  </span>
                </div>
                {order.paidAt && (
                  <p className="text-sm text-gray-500 mt-2">
                    Paid on {formatDate(order.paidAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                        <ShoppingBagIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{item.product?.name}</h4>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Order Summary */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {order.shippingCost === 0 ? 'FREE' : formatCurrency(order.shippingCost)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Delivery Information</h3>
                {order.deliveryInstructions && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <DocumentTextIcon className="h-3 w-3 mr-1" />
                    Special Instructions
                  </span>
                )}
              </div>

              <div className="space-y-6">
                {/* Address */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Address</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-gray-900">{order.address?.street}</p>
                        <p className="text-gray-600">
                          {order.address?.city}, {order.address?.state}
                        </p>
                        <p className="text-gray-600">
                          {order.address?.zipCode}, {order.address?.country}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{order.contactPhone || order.user?.phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Delivery Instructions</h4>
                    {order.deliveryInstructions && (
                      <span className="text-xs text-gray-500">
                        {order.deliveryInstructions.length} characters
                      </span>
                    )}
                  </div>
                  
                  {editMode ? (
                    <div>
                      <textarea
                        value={formData.deliveryInstructions}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                        rows={4}
                        maxLength={500}
                        placeholder="Add or update delivery instructions (gate codes, landmarks, timing, etc.)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">
                          These instructions will be shared with our delivery team
                        </p>
                        <span className={`text-xs ${formData.deliveryInstructions.length >= 490 ? 'text-red-500' : 'text-gray-500'}`}>
                          {formData.deliveryInstructions.length}/500
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {order.deliveryInstructions ? (
                        <div className="flex items-start">
                          <DocumentTextIcon className="h-5 w-5 text-purple-400 mr-2 mt-0.5" />
                          <div>
                            <p className="text-gray-900 whitespace-pre-wrap">{order.deliveryInstructions}</p>
                            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                              <p className="text-xs font-medium text-purple-800 mb-1">Why these instructions matter:</p>
                              <ul className="text-xs text-purple-700 space-y-1">
                                <li>• Helps delivery team locate your address quickly</li>
                                <li>• Reduces failed delivery attempts</li>
                                <li>• Ensures accurate delivery timing</li>
                                <li>• Improves customer satisfaction</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No delivery instructions provided</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Shipping Method */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Method</h4>
                  <div className="flex items-center">
                    <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700 capitalize">
                      {order.shippingMethod?.toLowerCase() || 'Standard Delivery'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            {editMode && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Notes</h3>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add internal notes about this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These notes are for internal use only and won't be shown to the customer
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Customer Info & Actions */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
                    <p className="text-xs text-gray-500">Customer</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.user?.email}</p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
                
                {order.user?.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.user.phone}</p>
                      <p className="text-xs text-gray-500">Phone</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Print Order
                </button>
                
                {order.user?.email && (
                  <button
                    onClick={() => {
                      window.location.href = `mailto:${order.user.email}?subject=Order%20${order.orderNumber}&body=Dear%20${order.user.name},%0A%0A`;
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Email Customer
                  </button>
                )}
                
                {order.user?.phone && (
                  <button
                    onClick={() => {
                      window.location.href = `tel:${order.user.phone}`;
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Call Customer
                  </button>
                )}
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Order Placed</p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <DocumentTextIcon className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-xs text-gray-500">{formatDate(order.updatedAt)}</p>
                    </div>
                  </div>
                )}

                {order.paidAt && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CurrencyRupeeIcon className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Payment Completed</p>
                      <p className="text-xs text-gray-500">{formatDate(order.paidAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;