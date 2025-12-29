// services/api.js - UPDATED WITH NEW MPESA FLOW
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with global configuration for regular API calls
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔑 Function to manually set auth header for the api instance
export const setAuthHeader = (token) => {
  if (token) {
    // Clean the token (remove any quotes)
    const cleanToken = token.replace(/['"]/g, '');
    
    // Set for regular API
    api.defaults.headers.common['Authorization'] = `Bearer ${cleanToken}`;
    
    console.log('🔐 Auth header set globally for the Axios instance');
  } else {
    delete api.defaults.headers.common['Authorization'];
    console.log('🔐 Auth header cleared globally');
  }
};

// 🔑 Initialize auth header from localStorage on app start
const initialToken = localStorage.getItem('token');
if (initialToken) {
  setAuthHeader(initialToken);
}

// ==================== REQUEST INTERCEPTORS ====================

// Request interceptor for regular API
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token && !config.headers.Authorization) {
      const cleanToken = token.replace(/['"]/g, '');
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
    
    // Log payment-related requests for debugging
    if (config.method === 'post' && config.url.includes('/mpesa')) {
      console.log('💰 MPESA API Request:', {
        url: config.url,
        data: config.data ? {
          ...config.data,
          phoneNumber: config.data.phoneNumber ? '***' + config.data.phoneNumber.slice(-3) : undefined
        } : {},
        headers: config.headers
      });
    }
    
    if (config.method === 'post' && config.url.includes('/orders')) {
      console.log('📦 Order API Request:', {
        url: config.url,
        data: config.data,
        headers: config.headers
      });
    }
    
    return config;
  },
  (error) => {
    console.error('🚨 API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTORS ====================

// Response interceptor for regular API
api.interceptors.response.use(
  (response) => {
    // Log successful payment responses
    if (response.config.url.includes('/mpesa') && response.config.method === 'post') {
      console.log('✅ MPESA API Response:', response.data);
    }
    // Log successful order responses
    if (response.config.url.includes('/orders') && response.config.method === 'post') {
      console.log('✅ Order API Response:', response.data);
    }
    return response;
  },
  (error) => {
    const { config, response } = error;
    
    // Log error details
    console.error('🚨 API Error:', {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data
    });
    
    // Handle 401 Unauthorized
    if (response?.status === 401) {
      console.log('🔐 401 Unauthorized - Clearing token');
      localStorage.removeItem('token');
      setAuthHeader(null);
      
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
        setTimeout(() => {
          window.location.href = `/login?redirect=${redirectTo}`;
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================== MPESA SPECIFIC API FUNCTIONS ====================

/**
 * Format phone number for M-Pesa (254XXXXXXXXX)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('0') && digits.length === 10) {
    return '254' + digits.substring(1);
  } else if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  } else if (digits.startsWith('7') && digits.length === 9) {
    return '254' + digits;
  }
  
  return null;
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone) => {
  const formatted = formatPhoneNumber(phone);
  return {
    isValid: !!formatted,
    formatted,
    message: formatted ? 'Valid phone number' : 'Invalid phone number. Use format: 0712345678'
  };
};

/**
 * Format and validate phone number
 */
export const formatAndValidatePhone = (phone) => {
  const validation = validatePhoneNumber(phone);
  return {
    ...validation,
    cleanPhone: validation.formatted || phone.replace(/\D/g, '')
  };
};

/**
 * Check if phone is likely Safaricom
 */
export const isLikelySafaricom = (phone) => {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return false;
  const prefix = formatted.substring(0, 6);
  const safaricomPrefixes = ['25470', '25471', '25472', '25473', '25474', '25475', '25476', '25477', '25478', '25479'];
  return safaricomPrefixes.some(p => formatted.startsWith(p));
};

// ==================== NEW PAYMENT FLOW API FUNCTIONS ====================

/**
 * NEW: Initiate payment flow (creates temporary order first)
 */
export const initiatePaymentFlow = async (paymentData) => {
  try {
    console.log('💰 Initiating NEW payment flow:', {
      phoneNumber: paymentData.phoneNumber ? '***' + paymentData.phoneNumber.slice(-3) : 'none',
      amount: paymentData.amount,
      itemsCount: paymentData.orderData?.items?.length || 0
    });
    
    const response = await api.post('/mpesa/initiate-payment', {
      phoneNumber: paymentData.phoneNumber,
      amount: paymentData.amount,
      orderData: paymentData.orderData
    });
    
    console.log('✅ Payment flow response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        checkoutRequestID: response.data.checkoutRequestID,
        orderId: response.data.orderId,
        message: response.data.message,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('❌ Payment flow initiation error:', error);
    
    // Extract error message
    let errorMessage = 'Payment initiation failed';
    
    if (error.response?.data) {
      const serverError = error.response.data;
      errorMessage = serverError.error || serverError.message || `Payment failed: ${error.response.status}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw {
      ...error,
      message: errorMessage,
      userMessage: errorMessage
    };
  }
};

/**
 * NEW: Check payment status
 */
export const checkPaymentStatus = async (checkoutRequestID) => {
  try {
    console.log('🔍 Checking payment status:', checkoutRequestID);
    
    const response = await api.get(`/mpesa/payment-status/${checkoutRequestID}`);
    
    console.log('✅ Payment status response:', response.data);
    
    return {
      success: response.data.success,
      status: response.data.status,
      transaction: response.data.transaction,
      orderId: response.data.orderId,
      message: response.data.message,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Payment status check error:', error);
    
    let errorMessage = 'Failed to check payment status';
    
    if (error.response?.data) {
      const serverError = error.response.data;
      errorMessage = serverError.error || serverError.message || errorMessage;
    }
    
    throw {
      ...error,
      message: errorMessage,
      userMessage: errorMessage
    };
  }
};

/**
 * NEW: Complete order after successful payment
 */
export const completeOrder = async (orderId) => {
  try {
    console.log('🔄 Completing order:', orderId);
    
    const response = await api.post(`/mpesa/complete-order/${orderId}`);
    
    console.log('✅ Order completion response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        order: response.data.order,
        message: response.data.message,
        data: response.data
      };
    } else {
      throw new Error(response.data.error || 'Order completion failed');
    }
  } catch (error) {
    console.error('❌ Order completion error:', error);
    
    let errorMessage = 'Failed to complete order';
    
    if (error.response?.data) {
      const serverError = error.response.data;
      errorMessage = serverError.error || serverError.message || errorMessage;
    }
    
    throw {
      ...error,
      message: errorMessage,
      userMessage: errorMessage
    };
  }
};

// ==================== LEGACY MPESA FUNCTIONS ====================

/**
 * Initiate M-Pesa STK Push (Lipa Na M-Pesa) - LEGACY
 */
export const initiateMpesaPayment = async (paymentData) => {
  try {
    console.log('📱 Initiating M-Pesa STK Push (legacy):', {
      phoneNumber: paymentData.phoneNumber,
      amount: paymentData.amount,
      orderId: paymentData.orderId
    });
    
    const response = await api.post('/mpesa/stkpush', paymentData);
    
    console.log('✅ M-Pesa STK Push response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        checkoutRequestID: response.data.data?.CheckoutRequestID || 
                           response.data.checkoutRequestID,
        merchantRequestID: response.data.data?.MerchantRequestID || 
                          response.data.merchantRequestID,
        message: response.data.message || 'M-Pesa prompt sent to your phone',
        data: response.data.data || response.data
      };
    } else {
      throw new Error(response.data.message || 'M-Pesa payment initiation failed');
    }
  } catch (error) {
    console.error('❌ M-Pesa STK Push error:', error);
    
    let errorMessage = 'M-Pesa payment initiation failed';
    
    if (error.response?.data) {
      const serverError = error.response.data;
      errorMessage = serverError.error || serverError.message || `M-Pesa failed: ${error.response.status}`;
    }
    
    throw {
      ...error,
      message: errorMessage,
      userMessage: errorMessage
    };
  }
};

/**
 * Query M-Pesa payment status - LEGACY
 */
export const queryMpesaPaymentStatus = async (checkoutRequestID) => {
  try {
    console.log('🔍 Querying M-Pesa payment status (legacy):', checkoutRequestID);
    
    const response = await api.post('/mpesa/query-status', { checkoutRequestID });
    
    console.log('✅ M-Pesa payment status response:', response.data);
    
    // Handle different API response structures
    const data = response.data.data || response.data;
    
    // Determine status based on response
    let status = 'PENDING';
    let resultCode = null;
    
    if (data.ResultCode === '0') {
      status = 'SUCCESS';
      resultCode = '0';
    } else if (data.ResultCode) {
      status = 'FAILED';
      resultCode = data.ResultCode;
    } else if (data.status) {
      status = data.status;
    }
    
    return {
      success: true,
      status,
      resultCode,
      resultDesc: data.ResultDesc || data.resultDesc || data.message,
      mpesaReceiptNumber: data.MpesaReceiptNumber || data.mpesaReceiptNumber,
      transactionDate: data.TransactionDate || data.transactionDate,
      phoneNumber: data.PhoneNumber || data.phoneNumber,
      amount: data.Amount || data.amount,
      checkoutRequestID: data.CheckoutRequestID || data.checkoutRequestID,
      merchantRequestID: data.MerchantRequestID || data.merchantRequestID,
      data: data
    };
  } catch (error) {
    console.error('❌ M-Pesa query error:', error);
    throw error;
  }
};

/**
 * Cancel M-Pesa payment - LEGACY
 */
export const cancelMpesaPayment = async (checkoutRequestID) => {
  try {
    console.log('❌ Cancelling M-Pesa payment:', checkoutRequestID);
    
    const response = await api.post('/mpesa/cancel-payment', { checkoutRequestID });
    
    console.log('✅ M-Pesa cancellation response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ M-Pesa cancellation error:', error);
    throw error;
  }
};

/**
 * Get user M-Pesa transactions
 */
export const getUserMpesaTransactions = async (params = {}) => {
  try {
    console.log('📋 Getting user M-Pesa transactions:', params);
    const response = await api.get('/mpesa/transactions', { params });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get transactions:', error);
    throw error;
  }
};

/**
 * Get specific M-Pesa transaction
 */
export const getMpesaTransaction = async (transactionId) => {
  try {
    console.log('📋 Getting M-Pesa transaction:', transactionId);
    const response = await api.get(`/mpesa/transaction/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get transaction:', error);
    throw error;
  }
};

/**
 * M-Pesa health check
 */
export const checkMpesaHealth = async () => {
  try {
    console.log('🏥 Checking M-Pesa health');
    const response = await api.get('/mpesa/health');
    return response.data;
  } catch (error) {
    console.error('❌ M-Pesa health check failed:', error);
    throw error;
  }
};

/**
 * Simulate M-Pesa callback (dev only)
 */
export const simulateMpesaCallback = async (checkoutRequestID, result = 'SUCCESS') => {
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('🧪 Simulating M-Pesa callback:', { checkoutRequestID, result });
      const response = await api.post('/mpesa/simulate-callback', { checkoutRequestID, result });
      return response.data;
    } catch (error) {
      console.error('❌ Callback simulation failed:', error);
      throw error;
    }
  }
  return Promise.reject(new Error('Simulation only available in development'));
};

/**
 * Poll payment status until completed/failed - NEW
 */
export const pollPaymentStatus = (checkoutRequestID, options = {}) => {
  const {
    interval = 5000, // Check every 5 seconds
    timeout = 300000, // 5 minutes timeout
    maxAttempts = 60 // 60 attempts (5 minutes at 5-second intervals)
  } = options;
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const startTime = Date.now();
    
    const checkStatus = async () => {
      attempts++;
      
      try {
        console.log(`🔄 Payment status check ${attempts} for ${checkoutRequestID}`);
        const status = await checkPaymentStatus(checkoutRequestID);
        
        // Check timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error('Payment polling timeout after 5 minutes'));
          return;
        }
        
        // Check max attempts
        if (attempts > maxAttempts) {
          reject(new Error('Max polling attempts reached'));
          return;
        }
        
        if (status.status === 'COMPLETED') {
          console.log(`✅ Payment completed, order: ${status.orderId}`);
          resolve({
            success: true,
            status: 'completed',
            orderId: status.orderId,
            transaction: status.transaction,
            attempts,
            elapsedTime: Date.now() - startTime
          });
        } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          console.log(`❌ Payment failed: ${checkoutRequestID}`);
          resolve({
            success: false,
            status: 'failed',
            error: status.message || 'Payment failed',
            attempts,
            elapsedTime: Date.now() - startTime
          });
        } else {
          // Still pending, check again after interval
          setTimeout(checkStatus, interval);
        }
      } catch (error) {
        console.error(`❌ Status check ${attempts} failed:`, error.message);
        
        // Check if we should retry or fail
        if (attempts >= maxAttempts) {
          reject(new Error(`Failed to check payment status after ${attempts} attempts`));
        } else {
          setTimeout(checkStatus, interval);
        }
      }
    };
    
    // Start polling
    checkStatus();
  });
};

// ==================== ORDER & PAYMENT API FUNCTIONS ====================

/**
 * Create order
 */
export const createOrder = async (data) => {
  try {
    console.log('📦 Creating order:', {
      addressId: data.addressId,
      itemsCount: data.items?.length || 0,
      totalAmount: data.totalAmount
    });
    
    const response = await api.post('/orders', data);
    console.log('✅ Order creation response:', response.data);
    
    // Handle different response structures
    const responseData = response.data;
    
    if (responseData.success) {
      // Extract order information from different possible structures
      const order = responseData.data?.order || responseData.order || responseData.data;
      const orderId = order?.id || order?._id || responseData.data?.orderId || responseData.orderId;
      
      return {
        success: true,
        order,
        orderId,
        message: responseData.message || 'Order created successfully',
        data: responseData.data || responseData
      };
    } else {
      throw new Error(responseData.error || 'Order creation failed');
    }
  } catch (error) {
    console.error('❌ Order creation error:', error);
    
    let errorMessage = 'Order creation failed';
    
    if (error.response?.data) {
      const serverError = error.response.data;
      errorMessage = serverError.error || serverError.message || errorMessage;
    }
    
    throw {
      ...error,
      message: errorMessage,
      userMessage: errorMessage
    };
  }
};

/**
 * Get all orders
 */
export const getAllOrders = () => api.get('/orders');

/**
 * Get order by ID
 */
export const getOrderById = (id) => api.get(`/orders/${id}`);

/**
 * Cancel order
 */
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);

/**
 * Update order payment status
 */
export const updatePaymentStatus = async (orderId, paymentData) => {
  try {
    console.log('💰 Updating order payment status:', { orderId, paymentData });
    
    const response = await api.put(`/orders/${orderId}/payment-status`, paymentData);
    
    console.log('✅ Order payment status updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update order payment status:', error);
    throw error;
  }
};

/**
 * Get order with full details
 */
export const getOrderDetails = async (orderId) => {
  try {
    const response = await api.get(`/orders/${orderId}`);
    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    console.error('❌ Failed to get order details:', error);
    throw error;
  }
};

/**
 * Create order with immediate payment - LEGACY
 */
export const createOrderWithPayment = async (orderData) => {
  try {
    console.log('🛒 Creating order with payment (legacy):', {
      addressId: orderData.addressId,
      itemsCount: orderData.items?.length || 0
    });
    
    // Validate required fields
    if (!orderData.addressId) {
      throw new Error('Shipping address is required');
    }
    
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Cart is empty');
    }
    
    const response = await api.post('/orders', orderData);
    
    console.log('✅ Order created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Create order error:', error);
    
    let errorMessage = 'Order creation failed';
    
    if (error.response?.data) {
      const backendError = error.response.data;
      errorMessage = backendError.error || backendError.message || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw {
      ...error,
      message: errorMessage,
      userMessage: errorMessage
    };
  }
};

// ==================== CHECKOUT HELPER FUNCTIONS ====================

export const completeCheckout = async (checkoutData) => {
  try {
    console.log('🛍️ Starting checkout process:', checkoutData);
    
    const { 
      cartItems, 
      addressId, 
      paymentMethod, 
      phoneNumber, 
      shippingMethod = 'standard', 
      shippingCost = 0,
      deliveryInstructions = '',
      notes = ''
    } = checkoutData;
    
    // Validate input
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Your cart is empty');
    }
    
    if (!addressId) {
      throw new Error('Please select a delivery address');
    }
    
    // Validate delivery instructions length
    if (deliveryInstructions && deliveryInstructions.length > 500) {
      throw new Error('Delivery instructions too long. Maximum 500 characters.');
    }
    
    const orderItems = cartItems.map(item => ({
      productId: item.product?.id || item.productId || item.id,
      quantity: item.quantity || 1,
      price: item.product?.salePrice || item.product?.price || item.price || 0
    }));
    
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + (shippingCost || 0);
    
    console.log('📝 Calculated totals:', { subtotal, shippingCost, total });
    
    let formattedPhone = phoneNumber;
    if (paymentMethod === 'MPESA' && phoneNumber) {
      formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format for MPESA');
      }
    }
    
    const orderData = {
      items: orderItems,
      addressId,
      paymentMethod,
      ...(paymentMethod === 'MPESA' && { phoneNumber: formattedPhone }),
      shippingMethod,
      shippingCost: shippingCost || 0,
      totalAmount: total,
      subtotal,
      deliveryInstructions: deliveryInstructions?.trim() || '',
      notes: notes?.trim() || ''
    };
    
    console.log('📤 Sending order to backend:', orderData);
    
    if (paymentMethod === 'CASH') {
      // For cash, create order immediately
      const orderResult = await createOrderWithPayment(orderData);
      
      return {
        success: true,
        order: orderResult.order || orderResult,
        nextStep: 'order_created'
      };
    } else if (paymentMethod === 'MPESA') {
      // For M-Pesa, use the new payment flow
      const paymentResponse = await initiatePaymentFlow({
        phoneNumber: formattedPhone,
        amount: total,
        orderData: {
          items: orderItems,
          subtotal,
          shippingCost,
          addressId,
          deliveryInstructions: deliveryInstructions?.trim() || ''
        }
      });
      
      return {
        success: true,
        checkoutRequestID: paymentResponse.checkoutRequestID,
        orderId: paymentResponse.orderId,
        message: paymentResponse.message,
        nextStep: 'payment_pending'
      };
    }
    
  } catch (error) {
    console.error('❌ Checkout failed:', error);
    
    let errorMessage = 'Checkout failed';
    let errorDetails = '';
    
    if (error.response?.data) {
      const backendError = error.response.data;
      errorMessage = backendError.error || backendError.message || errorMessage;
      errorDetails = backendError.details || '';
    } else if (error.userMessage) {
      errorMessage = error.userMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails,
      validationErrors: error.validationErrors,
      userMessage: error.userMessage || errorMessage
    };
  }
};

// ==================== INDIVIDUAL API FUNCTIONS ====================

// Cart API calls
export const getCart = () => api.get('/cart');
export const addCartItem = (data) => api.post('/cart/add', data);
export const updateCartItem = (data) => api.put(`/cart/item/${data.itemId}`, { quantity: data.quantity });
export const removeCartItem = (itemId) => api.delete(`/cart/item/${itemId}`);
export const clearCart = () => api.delete('/cart/clear');

export const getCartItemCount = async () => {
  try {
    const response = await api.get('/cart');
    return response.data.items?.length || 0;
  } catch (error) {
    return 0;
  }
};

// Auth API calls
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);

export const getAuthPhoneNumber = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data.phone;
  } catch (error) {
    return null;
  }
};

// Product API calls
export const getAllProducts = (params) => api.get('/products', { params });
export const getProductBySlug = (slug) => api.get(`/products/${slug}`);
export const getProductsByCategory = (categorySlug) => api.get(`/products?category=${categorySlug}`);
export const getProductsByBrand = (brandSlug) => api.get(`/products?brand=${brandSlug}`);
export const getProductsByCondition = (conditionSlug) => api.get(`/products?condition=${conditionSlug}`);
export const searchProducts = (query) => api.get('/products/search', { params: { q: query } });

export const checkProductAvailability = async (productId, quantity = 1) => {
  try {
    const response = await api.get(`/products/${productId}/availability`, { 
      params: { quantity } 
    });
    return response.data;
  } catch (error) {
    return { available: false, message: 'Cannot check availability' };
  }
};

// Category API calls
export const getAllCategories = () => api.get('/categories');
export const getCategoryBySlug = (slug) => api.get(`/categories/${slug}`);
export const getCategoryTree = () => api.get('/categories/tree');

// Condition API calls
export const getAllConditions = () => api.get('/conditions');
export const getConditionBySlug = (slug) => api.get(`/conditions/${slug}`);
export const getProductsByConditionSlug = (slug) => api.get(`/conditions/${slug}/products`);

// Brand API calls
export const getAllBrands = () => api.get('/brands');
export const getBrandBySlug = (slug) => api.get(`/brands/${slug}`);

// Address API calls
export const getAllAddresses = () => api.get('/addresses');
export const getAddressById = (id) => api.get(`/addresses/${id}`);
export const createAddress = (data) => api.post('/addresses', data);
export const updateAddress = (id, data) => api.put(`/addresses/${id}`, data);
export const deleteAddress = (id) => api.delete(`/addresses/${id}`);
export const setDefaultAddress = (id) => api.patch(`/addresses/${id}/default`);

export const getDefaultAddress = async () => {
  try {
    const response = await api.get('/addresses');
    const addresses = response.data || [];
    return addresses.find(addr => addr.isDefault) || addresses[0];
  } catch (error) {
    return null;
  }
};

// Shipping API calls
export const calculateShipping = (data) => api.post('/shipping/calculate', data).catch(error => {
  console.log('⚠️ Shipping API not available, using local fallback');
  throw error;
});

export const getShippingZones = () => api.get('/shipping/zones').catch(error => {
  console.log('⚠️ Shipping zones API not available');
  throw error;
});

export const estimateDelivery = (addressId) => {
  return api.get(`/shipping/estimate/${addressId}`).catch(() => ({
    success: false,
    estimatedDays: '3-5',
    message: 'Estimated delivery: 3-5 business days'
  }));
};

// Notification API calls
export const getAllNotifications = () => api.get('/notifications');
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => api.put('/notifications/read-all');
export const getUnreadNotificationCount = () => api.get('/notifications/unread-count');
export const createNotification = (data) => api.post('/notifications', data);

// ==================== BACKWARD COMPATIBILITY ====================

// For backward compatibility with existing code that uses object-style imports
export const authAPI = {
  login,
  register,
  getProfile,
  updateProfile,
  getPhoneNumber: getAuthPhoneNumber
};

export const cartAPI = {
  get: getCart,
  addItem: addCartItem,
  updateItem: updateCartItem,
  removeItem: removeCartItem,
  clear: clearCart,
  getItemCount: getCartItemCount
};

export const productAPI = {
  getAll: getAllProducts,
  getBySlug: getProductBySlug,
  getByCategory: getProductsByCategory,
  getByBrand: getProductsByBrand,
  getByCondition: getProductsByCondition,
  search: searchProducts,
  checkAvailability: checkProductAvailability
};

export const categoryAPI = {
  getAll: getAllCategories,
  getBySlug: getCategoryBySlug,
  getTree: getCategoryTree
};

export const conditionAPI = {
  getAll: getAllConditions,
  getBySlug: getConditionBySlug,
  getProductsBySlug: getProductsByConditionSlug
};

export const brandAPI = {
  getAll: getAllBrands,
  getBySlug: getBrandBySlug
};

export const addressAPI = {
  getAll: getAllAddresses,
  getById: getAddressById,
  create: createAddress,
  update: updateAddress,
  delete: deleteAddress,
  setDefault: setDefaultAddress,
  getDefault: getDefaultAddress
};

export const shippingAPI = {
  calculate: calculateShipping,
  getZones: getShippingZones,
  estimateDelivery: estimateDelivery
};

export const notificationAPI = {
  getAll: getAllNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  getUnreadCount: getUnreadNotificationCount,
  create: createNotification
};

// Updated mpesaAPI with new flow
export const mpesaAPI = {
  // Legacy functions (for backward compatibility)
  initiateSTKPush: initiateMpesaPayment,
  queryPaymentStatus: queryMpesaPaymentStatus,
  cancelPayment: cancelMpesaPayment,
  
  // New payment flow functions
  initiatePaymentFlow,
  checkPaymentStatus,
  completeOrder,
  pollPaymentStatus,
  
  // Utility functions
  formatPhoneNumber,
  validatePhoneNumber,
  formatAndValidatePhone,
  isLikelySafaricom,
  
  // Additional functions
  getUserTransactions: getUserMpesaTransactions,
  getTransaction: getMpesaTransaction,
  checkHealth: checkMpesaHealth,
  simulateCallback: simulateMpesaCallback
};

export const orderAPI = {
  create: createOrder,
  getAll: getAllOrders,
  getById: getOrderById,
  cancel: cancelOrder,
  updatePaymentStatus,
  getOrderDetails,
  createWithPayment: createOrderWithPayment
};

export const checkoutAPI = {
  completeCheckout
};

// Updated paymentAPI with new flow
export const paymentAPI = {
  // New payment flow
  initiatePayment: initiatePaymentFlow,
  checkPaymentStatus,
  completeOrder,
  pollPaymentStatus,
  
  // Utility functions
  formatPhoneNumber,
  validatePhoneNumber,
  
  // Legacy compatibility
  initiatePaymentFlow,
  getPaymentStatus: checkPaymentStatus
};

export default api;