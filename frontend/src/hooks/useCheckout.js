// src/hooks/useCheckout.js - FIXED VERSION WITH PROPER FUNCTION ORDER
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  cartAPI, 
  orderAPI, 
  addressAPI, 
  checkoutAPI,
  paymentAPI,
  mpesaAPI,
  shippingAPI
} from '../services/api';

export const useCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Refs
  const isInitializedRef = useRef(false);
  const pollingRef = useRef(null);
  
  // Main state
  const [cart, setCart] = useState({ items: [], subtotal: 0, total: 0 });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('COD');
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  
  // Payment flow states
  const [paymentStep, setPaymentStep] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [showAddressRequiredModal, setShowAddressRequiredModal] = useState(false);
  const [checkoutRequestID, setCheckoutRequestID] = useState(null);
  const [tempOrderId, setTempOrderId] = useState(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  
  // Shipping options state
  const [shippingOptions, setShippingOptions] = useState([]);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Calculated values
  const cartItemsCount = cart.items?.length || 0;
  const subtotal = cart.subtotal || 0;
  const shippingPrice = selectedShipping?.cost || 0;
  const total = subtotal + shippingPrice;

  // ==================== FORMATTING FUNCTIONS ====================

  // Format phone number for MPESA
  const formatPhoneForMpesa = useCallback((phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      return cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '254' + cleaned;
    } else if (cleaned.startsWith('+254') && cleaned.length === 13) {
      return cleaned.substring(1);
    }
    
    // If none of the above, try to format as 254XXXXXXXXX
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      return '254' + cleaned.slice(-9);
    }
    
    return '';
  }, []);

  // Format phone for display
  const formatPhoneForDisplay = useCallback((phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      return '0' + cleaned.substring(3);
    }
    
    return phone;
  }, []);

  // ==================== INITIALIZATION ====================

  // Initialize on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    console.log('🔄 useCheckout initialized');
    
    const addressId = searchParams.get('addressId');
    
    // Load initial data
    fetchInitialData(addressId);
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // ==================== DATA FETCHING FUNCTIONS ====================

  // Fetch all initial data
  const fetchInitialData = async (addressIdToSelect = null) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCart(),
        fetchAddresses(addressIdToSelect),
        fetchShippingOptions()
      ]);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart data
  const fetchCart = async () => {
    try {
      const response = await cartAPI.get();
      console.log('🛒 Cart response:', response);
      
      let items = [];
      let subtotal = 0;
      let total = 0;
      
      // Handle different API response structures
      if (response.data?.data?.cart?.items && Array.isArray(response.data.data.cart.items)) {
        items = response.data.data.cart.items;
        subtotal = response.data.data.cart.subtotal || 0;
        total = response.data.data.total || 0;
      } else if (response.data?.cart?.items && Array.isArray(response.data.cart.items)) {
        items = response.data.cart.items;
        subtotal = response.data.cart.subtotal || 0;
        total = response.data.total || 0;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        items = response.data.items;
        subtotal = response.data.subtotal || 0;
        total = response.data.total || 0;
      } else if (Array.isArray(response.data)) {
        items = response.data;
        subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
        total = subtotal;
      }
      
      // Ensure items have required properties
      items = items.map(item => ({
        id: item.id || item.productId || Math.random().toString(36).substr(2, 9),
        productId: item.productId || item.product?.id,
        product: item.product || { 
          id: item.productId, 
          name: item.productName || item.name, 
          price: item.price || item.product?.price 
        },
        name: item.product?.name || item.name || 'Product',
        price: item.price || item.product?.price || 0,
        quantity: item.quantity || 1,
        image: item.product?.image || item.image
      }));
      
      // Calculate totals if not provided
      if (subtotal === 0 && items.length > 0) {
        subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
      if (total === 0) {
        total = subtotal;
      }
      
      setCart({ items, subtotal, total });
      console.log('🛒 Cart set:', { items: items.length, subtotal, total });
      
    } catch (error) {
      console.error('❌ Failed to fetch cart:', error);
      setCart({ items: [], subtotal: 0, total: 0 });
    }
  };

  // Fetch addresses
  const fetchAddresses = async (addressIdToSelect = null) => {
    try {
      const response = await addressAPI.getAll();
      console.log('📍 Addresses response:', response);
      
      let addressesData = [];
      
      // Try different response structures
      if (response.data?.data?.addresses && Array.isArray(response.data.data.addresses)) {
        addressesData = response.data.data.addresses;
      } else if (response.data?.addresses && Array.isArray(response.data.addresses)) {
        addressesData = response.data.addresses;
      } else if (Array.isArray(response.data?.data)) {
        addressesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        addressesData = response.data;
      }
      
      console.log('📍 Extracted addresses:', addressesData.length);
      setAddresses(addressesData);
      
      // Auto-select address if none selected
      if (!selectedAddress && addressesData.length > 0) {
        let addressToSelect;
        
        // Try to select address from URL
        if (addressIdToSelect) {
          addressToSelect = addressesData.find(addr => addr.id === addressIdToSelect);
        }
        
        // Try to select default address
        if (!addressToSelect) {
          addressToSelect = addressesData.find(addr => addr.isDefault);
        }
        
        // Select first address
        if (!addressToSelect && addressesData.length > 0) {
          addressToSelect = addressesData[0];
        }
        
        if (addressToSelect) {
          console.log('📍 Auto-selecting address:', addressToSelect.id);
          handleSelectAddress(addressToSelect);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch addresses:', error);
      setAddresses([]);
    }
  };

  // Fetch shipping options
  const fetchShippingOptions = async () => {
    try {
      setLoadingShipping(true);
      
      // If we have a selected address, fetch shipping for it
      if (selectedAddress?.id) {
        const response = await shippingAPI.estimateDelivery(selectedAddress.id);
        if (response.data?.options && Array.isArray(response.data.options)) {
          setShippingOptions(response.data.options);
          
          // Auto-select first shipping option
          if (response.data.options.length > 0 && !selectedShipping) {
            setSelectedShipping(response.data.options[0]);
          }
        }
      }
      
      // Fallback to default options
      if (shippingOptions.length === 0) {
        const defaultOptions = [
          { 
            id: 'standard', 
            name: 'Standard Delivery', 
            cost: 150, 
            days: '3-5',
            estimatedDays: '3-5 business days',
            description: 'Regular delivery within 3-5 business days'
          },
          { 
            id: 'express', 
            name: 'Express Delivery', 
            cost: 300, 
            days: '1-2',
            estimatedDays: '1-2 business days',
            description: 'Fast delivery within 1-2 business days',
            available: subtotal >= 5000
          }
        ];
        
        setShippingOptions(defaultOptions);
        
        // Auto-select standard shipping if none selected
        if (!selectedShipping) {
          setSelectedShipping(defaultOptions[0]);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch shipping options:', error);
      
      // Set default options
      const defaultOptions = [
        { id: 'standard', name: 'Standard Delivery', cost: 150, days: '3-5' },
        { id: 'express', name: 'Express Delivery', cost: 300, days: '1-2' }
      ];
      
      setShippingOptions(defaultOptions);
      if (!selectedShipping) {
        setSelectedShipping(defaultOptions[0]);
      }
    } finally {
      setLoadingShipping(false);
    }
  };

  // Fetch shipping options for a specific address
  const fetchShippingOptionsForAddress = async (addressId) => {
    try {
      setLoadingShipping(true);
      
      // Try to fetch shipping, but handle 404 gracefully
      const response = await shippingAPI.estimateDelivery(addressId);
      
      if (response.data?.options && Array.isArray(response.data.options)) {
        setShippingOptions(response.data.options);
        
        // Auto-select first available shipping option
        if (response.data.options.length > 0) {
          const firstAvailable = response.data.options.find(opt => opt.available !== false) || response.data.options[0];
          setSelectedShipping(firstAvailable);
        }
      }
    } catch (error) {
      console.log('⚠️ Shipping API not available, using default options');
      
      // Set default shipping options
      const defaultOptions = [
        { 
          id: 'standard', 
          name: 'Standard Delivery', 
          cost: 150, 
          days: '1-2',
          estimatedDays: '1-2 days',
          description: 'Regular delivery within 3-5 business days',
          available: true
        },
        { 
          id: 'express', 
          name: 'Express Delivery', 
          cost: 300, 
          days: '1',
          estimatedDays: 'within the day',
          description: 'Fast delivery within the day',
          available: subtotal >= 5000
        }
      ];
      
      setShippingOptions(defaultOptions);
      
      // Auto-select standard shipping
      setSelectedShipping(defaultOptions[0]);
    } finally {
      setLoadingShipping(false);
    }
  };

  // ==================== HANDLER FUNCTIONS ====================

  // Handle address selection
  const handleSelectAddress = useCallback((address) => {
    console.log('📍 Selecting address:', address);
    
    if (!address || !address.id) {
      console.error('📍 Invalid address provided');
      return;
    }
    
    // Save to localStorage for persistence
    localStorage.setItem('selectedCheckoutAddress', JSON.stringify(address));
    
    // Update state
    setSelectedAddress(address);
    
    // If address has no phone and payment method is MPESA, switch to COD
    if (selectedPaymentMethod === 'MPESA' && (!address.phone || address.phone.length < 10)) {
      console.log('📍 No phone for MPESA, switching to COD');
      setSelectedPaymentMethod('COD');
    }
    
    // Fetch shipping options for new address
    fetchShippingOptionsForAddress(address.id);
    
    console.log('✅ Address selected successfully');
  }, [selectedPaymentMethod]);

  // Handle shipping selection
  const handleSelectShipping = useCallback((shippingOptionId) => {
    const option = shippingOptions.find(opt => opt.id === shippingOptionId);
    if (option && (option.available !== false)) {
      setSelectedShipping(option);
      console.log('🚚 Shipping option selected:', option);
    }
  }, [shippingOptions]);

  // Handle payment method selection
  const handleSelectPaymentMethod = useCallback((method) => {
    console.log('💳 handleSelectPaymentMethod called with:', method);
    
    // Validate method
    if (method !== 'COD' && method !== 'MPESA') {
      console.warn('💳 Invalid payment method:', method);
      return;
    }
    
    // If selecting MPESA and address has no phone, show phone modal
    if (method === 'MPESA' && (!selectedAddress?.phone || selectedAddress.phone.length < 10)) {
      console.log('📱 No phone for MPESA, showing phone modal');
      setShowPhoneModal(true);
      return; // Don't set payment method yet
    }
    
    // Set the payment method
    setSelectedPaymentMethod(method);
    console.log('✅ Payment method set to:', method);
  }, [selectedAddress]);

  // Handle phone modal submit
  const handlePhoneModalSubmit = useCallback((phoneNumber) => {
    console.log('📱 Phone number submitted:', phoneNumber);
    
    // Validate phone
    if (!phoneNumber || phoneNumber.length < 10) {
      setPaymentError('Please enter a valid phone number (at least 10 digits)');
      return;
    }
    
    // Format and validate phone
    const formattedPhone = formatPhoneForMpesa(phoneNumber);
    if (!formattedPhone || formattedPhone.length !== 12) {
      setPaymentError('Invalid phone number format. Use format: 0712345678');
      return;
    }
    
    // Update selected address with phone number
    if (selectedAddress) {
      const updatedAddress = { 
        ...selectedAddress, 
        phone: formattedPhone 
      };
      setSelectedAddress(updatedAddress);
      localStorage.setItem('selectedCheckoutAddress', JSON.stringify(updatedAddress));
      
      // Now set payment method to MPESA
      setSelectedPaymentMethod('MPESA');
      console.log('✅ Payment method set to MPESA after phone entry');
    }
    
    setShowPhoneModal(false);
  }, [selectedAddress, formatPhoneForMpesa]);

  // Handle delivery instructions change
  const handleDeliveryInstructionsChange = useCallback((instructions) => {
    setDeliveryInstructions(instructions);
  }, []);

  // Handle add address
  const handleAddAddress = useCallback(() => {
    navigate('/checkout/address?return=/checkout&source=checkout');
  }, [navigate]);

  // ==================== ORDER COMPLETION & MPESA FUNCTIONS ====================

  // Handle order completion - MUST BE DEFINED FIRST
  const handleOrderComplete = useCallback(async (orderId, paymentMethod = 'cod') => {
    try {
      // Clear cart
      await cartAPI.clear();
      
      // Clear localStorage
      localStorage.removeItem('selectedCheckoutAddress');
      
      // Navigate to confirmation page
      navigate(`/orders/${orderId}/confirmation?payment=${paymentMethod}`);
      
    } catch (error) {
      console.error('❌ Order completion cleanup failed:', error);
      // Still navigate even if cleanup fails
      navigate(`/orders/${orderId}/confirmation?payment=${paymentMethod}`);
    }
  }, [navigate]);

  // Start payment polling - DEFINED SECOND
  const startPaymentPolling = useCallback((checkoutId, orderId) => {
    // Clear existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5-second intervals
    
    const poll = async () => {
      attempts++;
      setPollingAttempts(attempts);
      console.log(`🔄 Polling attempt ${attempts} for checkout ID: ${checkoutId}`);
      
      try {
        const response = await paymentAPI.checkPaymentStatus(checkoutId);
        console.log('📊 Payment status response:', response);
        
        if (response.success) {
          const { status, transaction } = response;
          
          if (status === 'COMPLETED') {
            // Payment successful!
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setPaymentStep('payment_complete');
            
            console.log('✅ MPESA Payment Successful:', transaction);
            
            // Complete the order
            try {
              const completeResponse = await paymentAPI.completeOrder(orderId);
              console.log('✅ Order completed:', completeResponse);
              
              // Redirect to order confirmation
              setTimeout(() => {
                handleOrderComplete(orderId, 'mpesa');
              }, 5000);
              
            } catch (completeError) {
              console.error('⚠️ Order completion error:', completeError);
              // Still redirect but log the error
              setTimeout(() => {
                handleOrderComplete(orderId, 'mpesa');
              }, 5000);
            }
            
          } else if (status === 'FAILED' || status === 'CANCELLED') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            const errorMsg = transaction?.resultDesc || 'Payment failed. Please try again.';
            setPaymentError(errorMsg);
            setPaymentStep('payment_error');
            setPlacingOrder(false);
          }
          
          // Stop polling after max attempts if still pending
          if (attempts >= maxAttempts && status === 'PENDING') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setPaymentError('Payment timeout. Please check your phone and try again.');
            setPaymentStep('payment_error');
            setPlacingOrder(false);
          }
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        
        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPaymentError('Failed to verify payment status');
          setPaymentStep('payment_error');
          setPlacingOrder(false);
        }
      }
    };
    
    // Start polling
    poll();
    pollingRef.current = setInterval(poll, 5000);
    
    // Auto-timeout after 5 minutes
    const timeoutId = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        if (paymentStep === 'mpesa_prompt') {
          setPaymentError('Payment timeout. Please try again.');
          setPaymentStep('payment_error');
          setPlacingOrder(false);
        }
      }
    }, 300000);
    
    return () => clearTimeout(timeoutId);
  }, [paymentStep, handleOrderComplete]);

  // Handle MPESA payment - DEFINED THIRD
  const handleMpesaPayment = useCallback(async (orderId, amount, phoneNumber) => {
    try {
      console.log('📱 Starting MPESA payment flow');
      console.log('Order ID:', orderId);
      console.log('Amount:', amount);
      console.log('Phone:', phoneNumber);
      
      // Format phone
      const formattedPhone = formatPhoneForMpesa(phoneNumber);
      if (!formattedPhone || formattedPhone.length !== 12) {
        throw new Error('Invalid phone number format. Please use format: 0712345678');
      }
      
      // Round amount
      const roundedAmount = Math.round(amount);
      if (roundedAmount < 1 || roundedAmount > 70000) {
        throw new Error('Amount must be between KES 1 and KES 70,000');
      }
      
      // Show MPESA prompt
      setPaymentStep('mpesa_prompt');
      
      // Use the new payment flow
      const paymentResponse = await paymentAPI.initiatePayment({
        phoneNumber: formattedPhone,
        amount: roundedAmount,
        orderData: {
          items: cart.items.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity || 1,
            price: item.price || 0
          })),
          subtotal: subtotal,
          shippingCost: shippingPrice || 0,
          addressId: selectedAddress?.id,
          deliveryInstructions: deliveryInstructions || ''
        }
      });
      
      console.log('💰 Payment initiation response:', paymentResponse);
      
      if (paymentResponse.success) {
        const checkoutId = paymentResponse.checkoutRequestID;
        const tempOrderId = paymentResponse.orderId;
        
        setCheckoutRequestID(checkoutId);
        setTempOrderId(tempOrderId);
        
        // Start polling for payment status
        startPaymentPolling(checkoutId, tempOrderId || orderId);
      } else {
        throw new Error(paymentResponse.error || 'Payment initiation failed');
      }
      
    } catch (error) {
      console.error('❌ MPESA payment error:', error);
      setPaymentError(error.message || 'Failed to initiate MPESA payment');
      setPaymentStep('payment_error');
      setPlacingOrder(false);
    }
  }, [cart, subtotal, shippingPrice, selectedAddress, deliveryInstructions, formatPhoneForMpesa, startPaymentPolling]);

  // ==================== ORDER PLACEMENT FUNCTION ====================

  // Main place order function - DEFINED LAST
  const handlePlaceOrder = useCallback(async () => {
    try {
      console.log('🚀 handlePlaceOrder called');
      console.log('Payment method:', selectedPaymentMethod);
      console.log('Selected address:', selectedAddress);
      console.log('Cart items:', cart.items?.length);
      
      // Validation
      if (!selectedAddress?.id) {
        console.error('❌ No address selected');
        setOrderError('Please select a shipping address');
        setShowAddressRequiredModal(true);
        throw new Error('Please select a shipping address');
      }

      if (!cart.items?.length) {
        console.error('❌ Cart is empty');
        setOrderError('Your cart is empty');
        navigate('/products');
        throw new Error('Your cart is empty');
      }

      setPlacingOrder(true);
      setOrderError('');
      setPaymentError('');

      // For MPESA, ensure phone number exists
      if (selectedPaymentMethod === 'MPESA' && (!selectedAddress?.phone || selectedAddress.phone.length < 10)) {
        console.log('📱 No phone for MPESA, showing phone modal');
        setShowPhoneModal(true);
        setPlacingOrder(false);
        return;
      }

      // Show processing step
      setPaymentStep('processing');

      // Prepare cart items for backend
      const cartItems = cart.items.map(item => ({
        productId: item.productId || item.product?.id,
        quantity: item.quantity || 1,
        price: item.price || 0
      }));

      // Prepare order data
      const orderData = {
        items: cartItems,
        addressId: selectedAddress.id,
        paymentMethod: selectedPaymentMethod === 'MPESA' ? 'MPESA' : 'CASH',
        shippingCost: shippingPrice || 0,
        subtotal: subtotal,
        totalAmount: total,
        deliveryInstructions: deliveryInstructions || '',
        contactPhone: selectedAddress?.phone || '',
        shippingMethod: selectedShipping?.id || 'standard'
      };

      console.log('📤 Creating order with data:', orderData);

      // Call the order API
      const response = await orderAPI.create(orderData);
      
      // FIX: Log the complete response for debugging
      console.log('✅ Order API FULL response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });

      // Check for successful response in multiple ways:
      // 1. Check HTTP status (201 = Created)
      // 2. Check for success flag in data
      // 3. Check for order creation indicators
      const isSuccessful = 
        response.status === 201 || 
        response.data?.success === true ||
        response.data?.status === 'success' ||
        (response.data && ('orderId' in response.data || 'order' in response.data || 'id' in response.data));
      
      if (isSuccessful) {
        console.log('✅ Order created successfully, processing response...');
        
        // Extract order ID from all possible response structures
        let orderId = 
          response.data?.data?.order?.id ||
          response.data?.order?.id ||
          response.data?.data?.orderId ||
          response.data?.orderId ||
          response.data?.data?.id ||
          response.data?.id;
        
        // Also try to extract from any ID fields in the response
        if (!orderId) {
          // Search recursively for any ID that looks like an order ID
          const findOrderId = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            
            for (const key in obj) {
              const value = obj[key];
              
              // Check if this is an ID field that could be an order ID
              if (key.toLowerCase().includes('order') && key.toLowerCase().includes('id')) {
                if (typeof value === 'string' && value) return value;
              }
              
              // Check if value is an ID string (starts with 'cmj' or 'ORD' based on your logs)
              if (typeof value === 'string' && (value.startsWith('cmj') || value.startsWith('ORD'))) {
                return value;
              }
              
              // Recursively search nested objects
              if (typeof value === 'object' && value !== null) {
                const found = findOrderId(value);
                if (found) return found;
              }
            }
            return null;
          };
          
          orderId = findOrderId(response.data);
        }
        
        console.log('📝 Extracted Order ID:', orderId);
        
        // If still no orderId, check the success message
        if (!orderId) {
          console.log('🔍 Checking response message for order ID...');
          const message = response.data?.message || response.data?.data?.message || '';
          console.log('Message:', message);
          
          // Look for order ID patterns in the message
          if (message.includes('ORD') || message.includes('order')) {
            const patterns = [
              /ORD\d+/g,
              /order[:\s]+([a-f0-9-]+)/i,
              /ID[:\s]+([a-f0-9-]+)/i,
              /([a-f0-9-]{20,})/i
            ];
            
            for (const pattern of patterns) {
              const matches = message.match(pattern);
              if (matches && matches[0]) {
                orderId = matches[0];
                console.log('📝 Found orderId in message:', orderId);
                break;
              }
            }
          }
        }
        
        if (orderId) {
          setOrderId(orderId);
          
          if (selectedPaymentMethod === 'MPESA') {
            // For MPESA, initiate payment
            await handleMpesaPayment(orderId, total, selectedAddress.phone);
          } else {
            // For COD, show order complete
            setPaymentStep('order_complete');
            
            // Clear cart and redirect after delay
            setTimeout(() => {
              handleOrderComplete(orderId);
            }, 5000);
          }
          
          return {
            success: true,
            orderId,
            order: response.data?.order || response.data?.data?.order,
            message: response.data?.message || response.data?.data?.message || 'Order created successfully'
          };
        } else {
          // If we can't find orderId but the order was created, show a generic success
          console.warn('⚠️ Could not extract orderId, but order was created successfully');
          console.warn('Full response data:', response.data);
          
          setPaymentStep('order_complete');
          
          // Provide a fallback order ID (timestamp-based)
          const fallbackOrderId = `ORD${Date.now()}`;
          setOrderId(fallbackOrderId);
          
          setTimeout(() => {
            // Redirect to orders page
            navigate('/orders');
          }, 5000);
          
          return {
            success: true,
            orderId: fallbackOrderId,
            message: 'Order created successfully! Please check your orders page.'
          };
        }
      } else {
        // If response indicates failure
        console.error('❌ Order creation failed. Response:', response);
        const errorMessage = 
          response.data?.error ||
          response.data?.message ||
          response.data?.data?.error ||
          response.data?.data?.message ||
          response.statusText ||
          `Order creation failed (Status: ${response.status})`;
        
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ Order placement failed:', error);
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message ||
        error.response?.data?.data?.error ||
        error.response?.data?.data?.message ||
        error.message || 
        'Failed to place order';
      
      console.error('❌ Error details:', {
        message: errorMessage,
        response: error.response,
        error: error
      });
      
      setOrderError(errorMessage);
      setPlacingOrder(false);
      
      // Show payment error if it's a payment-related error
      if (errorMessage.toLowerCase().includes('payment') || 
          errorMessage.toLowerCase().includes('mpesa') || 
          errorMessage.toLowerCase().includes('card')) {
        setPaymentError(errorMessage);
        setPaymentStep('payment_error');
      }
      
      throw error;
    }
  }, [
    selectedAddress, 
    cart, 
    selectedPaymentMethod, 
    shippingPrice, 
    subtotal, 
    total, 
    deliveryInstructions, 
    selectedShipping,
    navigate,
    handleMpesaPayment,
    handleOrderComplete
  ]);

  // ==================== PAYMENT FLOW HANDLERS ====================

  // Handle payment retry
  const handlePaymentRetry = useCallback(() => {
    console.log('🔄 Retrying payment...');
    setPaymentError('');
    setPaymentStep(null);
    setPlacingOrder(false);
    
    if (checkoutRequestID && tempOrderId) {
      // Retry polling
      startPaymentPolling(checkoutRequestID, tempOrderId);
    } else {
      // Retry from beginning
      handlePlaceOrder();
    }
  }, [checkoutRequestID, tempOrderId, startPaymentPolling, handlePlaceOrder]);

  // Handle payment flow close
  const handlePaymentFlowClose = useCallback(() => {
    console.log('❌ Closing payment flow');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPaymentStep(null);
    setPaymentError('');
    setPlacingOrder(false);
  }, []);

  // Handle phone modal close
  const handlePhoneModalClose = useCallback(() => {
    setShowPhoneModal(false);
  }, []);

  // ==================== UTILITY FUNCTIONS ====================

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCart(), fetchAddresses(), fetchShippingOptions()]);
      console.log('🔄 Data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear errors
  const clearError = useCallback(() => {
    setOrderError('');
    setPaymentError('');
  }, []);

  // Get delivery estimate
  const getDeliveryEstimate = useCallback(() => {
    if (selectedShipping) {
      return selectedShipping.days || selectedShipping.estimatedDays || '3-5 business days';
    }
    return '3-5 business days';
  }, [selectedShipping]);

  // Get shipping cost
  const getShippingCost = useCallback(() => {
    return shippingPrice;
  }, [shippingPrice]);

  // Get total amount
  const getTotalAmount = useCallback(() => {
    return total;
  }, [total]);

  // Get cart item count
  const getCartItemCount = useCallback(() => {
    return cartItemsCount;
  }, [cartItemsCount]);

  // Check if MPESA payment is available for current address
  const isMpesaAvailable = useCallback(() => {
    return selectedAddress?.phone && selectedAddress.phone.length >= 10;
  }, [selectedAddress]);

  // Check if COD payment is available
  const isCodAvailable = useCallback(() => {
    // COD is always available unless there are specific restrictions
    return true;
  }, []);

  // ==================== RETURN OBJECT ====================

  return {
    // State
    cart,
    addresses,
    selectedAddress,
    shippingOptions,
    selectedShipping,
    selectedPaymentMethod,
    loading,
    placingOrder,
    showPhoneModal,
    total,
    cartItemsCount,
    subtotal,
    shippingPrice,
    deliveryInstructions,
    orderError,
    orderSuccess,
    orderId,
    
    // Payment flow states
    paymentStep,
    paymentError,
    showAddressRequiredModal,
    checkoutRequestID,
    tempOrderId,
    pollingAttempts,
    loadingShipping,
    
    // Actions
    handleAddAddress,
    handleSelectAddress,
    handleSelectShipping,
    handlePlaceOrder,
    handleSelectPaymentMethod,
    handlePhoneModalSubmit,
    handleDeliveryInstructionsChange,
    refreshData,
    clearError,
    getDeliveryEstimate,
    getShippingCost,
    getTotalAmount,
    getCartItemCount,
    isMpesaAvailable,
    isCodAvailable,
    
    // Payment flow handlers
    handlePaymentRetry,
    handlePaymentFlowClose,
    handlePhoneModalClose,
    
    // For direct state updates
    setSelectedAddress,
    setSelectedPaymentMethod,
    setShowPhoneModal,
    setShowAddressRequiredModal,
    setDeliveryInstructions,
    setPaymentStep,
    setPaymentError,
    
    // Formatting functions
    formatPhoneForMpesa,
    formatPhoneForDisplay,
    
    // Data fetching functions (for external use if needed)
    fetchCart,
    fetchAddresses,
    fetchShippingOptions,
    
    // Shipping selection
    handleSelectShipping,
  };
};