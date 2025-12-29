// frontend/src/pages/customer/OrderSuccess.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../services/api';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      navigate('/orders');
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await orderAPI.getById(orderId);
        setOrder(response.data.order);
      } catch (error) {
        console.error('Failed to load order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-green-600 text-3xl">✅</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {order?.paymentStatus === 'PAID' ? 'Payment Successful!' : 'Order Confirmed!'}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {order?.paymentStatus === 'PAID' 
              ? 'Thank you for your payment. Your order is being processed.'
              : 'Thank you for your order. Please pay on delivery.'
            }
          </p>

          {order && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-semibold">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-green-600">
                    KES {order.totalAmount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-semibold">
                    {order.paymentMethod === 'CASH' ? 'Cash on Delivery' : 'M-Pesa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`font-semibold ${
                    order.paymentStatus === 'PAID' ? 'text-green-600' : 
                    order.paymentStatus === 'UNPAID' ? 'text-yellow-600' : 
                    'text-gray-600'
                  }`}>
                    {order.paymentStatus === 'PAID' ? 'Paid' : 
                     order.paymentStatus === 'UNPAID' ? 'To be paid on delivery' : 
                     order.paymentStatus}
                  </span>
                </div>
                {order.mpesaReceiptNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">MPESA Receipt:</span>
                    <span className="font-semibold">{order.mpesaReceiptNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Link
              to="/orders"
              className="block w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View My Orders
            </Link>
            
            <Link
              to="/products"
              className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact us at support@mediquick.co.ke or call +254 700 000 000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}