// services/checkoutService.js
import { orderAPI, mpesaAPI } from './api';

class CheckoutService {

  formatOrderData(items, addressId, paymentMethod, phoneNumber, shippingMethod = 'standard', shippingCost = 0) {
    console.log('🛒 Formatting order data from items:', items);
    
    // Note: phoneNumber parameter is kept for frontend validation but NOT sent to backend
    
    const formattedItems = items.map(item => ({
      productId: item.productId || item.product?.id || item.id,
      quantity: item.quantity || 1,
      price: item.product?.price || item.price || 0,
    }));

    // Calculate totals
    const subtotal = formattedItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const total = subtotal + shippingCost;

    console.log('💰 Calculated totals:', {
      subtotal,
      shippingCost,
      total,
      itemCount: formattedItems.length
    });

    // Return order data WITHOUT phone number
    const orderData = {
      items: formattedItems,
      addressId,
      paymentMethod: paymentMethod || 'MPESA',
      shippingMethod: shippingMethod || 'standard',
      shippingCost: shippingCost || 0,
      totalAmount: total,
      subtotal: subtotal,
      status: 'pending'
    };

    console.log('📦 Order data being sent to backend:', orderData);
    return orderData;
  }

  formatPhoneNumber(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    console.log('📱 Formatting phone number:', { original: phone, digits });
    
    // Check if it's a valid Kenyan number
    if (digits.length < 9 || digits.length > 12) {
      console.log('❌ Invalid phone length:', digits.length);
      return null;
    }

    // Format to 254 format
    let formatted = null;
    
    if (digits.startsWith('0') && digits.length === 10) {
      formatted = '254' + digits.substring(1);
    } else if (digits.startsWith('254') && digits.length === 12) {
      formatted = digits;
    } else if (digits.startsWith('7') && digits.length === 9) {
      formatted = '254' + digits;
    }
    
    console.log('📱 Formatted phone:', formatted);
    return formatted;
  }

  calculateShippingLocal(area, total = 0) {
    console.log('🚚 Calculating shipping for:', { area, total });
    
    if (!area) {
      return {
        standard: { price: 300, days: 3, available: true, isFree: false, minOrderAmount: 3000 },
        sameDay: { price: 450, days: 0, available: false, additional: 150, isFree: false },
        express: { price: 600, hours: 3, available: false, additional: 300, isFree: false }
      };
    }
    
    const areaLower = area.toLowerCase();
    let basePrice = 300;
    let minOrder = 3000;
    let days = 3;
    let canSameDay = false;
    let canExpress = false;

    if (areaLower.includes('cbd') || areaLower.includes('upper hill') || areaLower.includes('westlands cbd')) {
      basePrice = 150;
      minOrder = 3000;
      days = 1;
      canSameDay = true;
      canExpress = true;
    } else if (areaLower.includes('westlands') || areaLower.includes('lavington') || areaLower.includes('kileleshwa')) {
      basePrice = 200;
      minOrder = 2500;
      days = 1;
      canSameDay = true;
      canExpress = true;
    } else if (areaLower.includes('karen') || areaLower.includes('langata') || areaLower.includes('south')) {
      basePrice = 250;
      minOrder = 2500;
      days = 2;
      canSameDay = true;
      canExpress = false;
    } else if (areaLower.includes('eastleigh') || areaLower.includes('embakasi') || areaLower.includes('buruburu')) {
      basePrice = 250;
      minOrder = 2000;
      days = 2;
      canSameDay = false;
      canExpress = false;
    }

    const isFree = total >= minOrder;
    
    const shippingOptions = {
      standard: { 
        price: isFree ? 0 : basePrice, 
        days, 
        available: true, 
        isFree, 
        minOrderAmount: minOrder 
      },
      sameDay: { 
        price: isFree ? 150 : basePrice + 150, 
        days: 0, 
        available: canSameDay, 
        additional: 150, 
        isFree: false 
      },
      express: { 
        price: isFree ? 300 : basePrice + 300, 
        hours: 3, 
        available: canExpress, 
        additional: 300, 
        isFree: false 
      }
    };
    
    console.log('🚚 Shipping options calculated:', shippingOptions);
    return shippingOptions;
  }

  async completeCheckout(orderData) {
    try {
      console.log('🛒 Starting checkout process...');
      console.log('📝 Full order data:', JSON.stringify(orderData, null, 2));

      // Validate required fields
      if (!orderData.addressId) {
        throw new Error('Shipping address is required');
      }

      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Only validate phone number for MPESA payments
      if (orderData.paymentMethod === 'MPESA' && !orderData.phoneNumber) {
        throw new Error('Phone number is required for MPESA payments');
      }

      console.log('📤 Sending order to backend API...');
      
      // Send to backend
      const result = await orderAPI.createWithPayment(orderData);
      
      console.log('✅ Checkout successful - Backend response:', result);
      
      return {
        success: true,
        order: result.order || result,
        paymentInitiated: result.paymentInitiated !== false,
        paymentData: result.paymentData,
        message: result.message || 'Order created successfully'
      };
      
    } catch (error) {
      console.error('❌ Checkout failed:', error);
      
      let errorMessage = 'Checkout failed. Please try again.';
      
      if (error.response) {
        const backendError = error.response.data;
        console.error('🚨 Backend error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: backendError,
          headers: error.response.headers
        });
        
        if (backendError.error) {
          errorMessage = backendError.error;
        } else if (backendError.message) {
          errorMessage = backendError.message;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid information provided. Please check your details.';
        } else if (error.response.status === 401) {
          errorMessage = 'Please login to continue';
          localStorage.removeItem('token');
          window.location.href = '/login';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async monitorPayment(orderId, onStatusUpdate) {
    try {
      const result = await orderAPI.checkPaymentStatus(orderId);
      
      if (result.data && !result.data.needsPayment) {
        onStatusUpdate({ status: 'payment_complete', result });
        return result;
      }
      
      // Continue polling
      setTimeout(() => {
        this.monitorPayment(orderId, onStatusUpdate);
      }, 5000);
      
    } catch (error) {
      onStatusUpdate({ status: 'polling_error', error });
    }
  }

  async retryPayment(orderId, phoneNumber) {
    try {
      const result = await orderAPI.initiatePayment(orderId, {
        paymentMethod: 'MPESA',
        phoneNumber: this.formatPhoneNumber(phoneNumber)
      });
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retry payment'
      };
    }
  }
}

// Create and export instance
const checkoutService = new CheckoutService();
export default checkoutService;