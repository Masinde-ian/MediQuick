import { useState, useEffect, useCallback } from 'react';
import { mpesaAPI } from '../services/api';

export const useMpesaPayment = ({
  amount,
  orderData,
  phoneNumber: initialPhone = "",
  onSuccess,
  onError,
  onStatusChange,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, pending, completed, failed
  const [checkoutRequestID, setCheckoutRequestID] = useState('');
  const [orderId, setOrderId] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Format phone number for display
  const formatDisplayPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return `0${cleaned.substring(3)}`;
    }
    return phone;
  };

  // Format phone number for API
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('254') && cleaned.length === 12) {
      // Already in 254 format
    } else if (cleaned.startsWith('+254') && cleaned.length === 13) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 9 && cleaned.length <= 12;
  };

  // Start payment polling
  const startPaymentPolling = useCallback((checkoutID, orderID) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5-second intervals

    const poll = async () => {
      attempts++;
      setPollingAttempts(attempts);
      
      if (onStatusChange) {
        onStatusChange('polling', { attempts, maxAttempts });
      }

      try {
        console.log(`🔍 Polling payment status (attempt ${attempts}/${maxAttempts})`);
        const response = await mpesaAPI.checkPaymentStatus(checkoutID);
        
        if (response.data.success) {
          const { status, transaction, orderId: responseOrderId } = response.data;
          
          // Update payment status
          setPaymentStatus(status === 'COMPLETED' ? 'completed' : 
                         status === 'FAILED' ? 'failed' : 
                         status === 'CANCELLED' ? 'failed' : 'pending');
          
          setPaymentDetails(transaction);

          if (status === 'COMPLETED') {
            clearInterval(pollingInterval);
            setPollingInterval(null);
            
            // Complete the order
            if (responseOrderId) {
              try {
                const completeResponse = await mpesaAPI.completeOrder(responseOrderId);
                if (completeResponse.data.success) {
                  console.log('✅ Order completed successfully');
                  
                  if (onSuccess) {
                    onSuccess({
                      checkoutRequestID: checkoutID,
                      orderId: responseOrderId,
                      order: completeResponse.data.order,
                      transaction: transaction,
                      message: 'Payment and order completed successfully'
                    });
                  }
                  
                  if (onStatusChange) {
                    onStatusChange('completed', {
                      order: completeResponse.data.order,
                      transaction: transaction
                    });
                  }
                } else {
                  console.error('❌ Failed to complete order:', completeResponse.data.error);
                  if (onError) {
                    onError(new Error('Failed to complete order: ' + completeResponse.data.error));
                  }
                }
              } catch (completeError) {
                console.error('❌ Error completing order:', completeError);
                if (onError) {
                  onError(completeError);
                }
              }
            } else {
              // No order to complete, just notify success
              if (onSuccess) {
                onSuccess({
                  checkoutRequestID: checkoutID,
                  transaction: transaction,
                  message: 'Payment completed successfully'
                });
              }
            }
          } else if (status === 'FAILED' || status === 'CANCELLED') {
            clearInterval(pollingInterval);
            setPollingInterval(null);
            setPaymentStatus('failed');
            setError(transaction.resultDesc || 'Payment failed');
            
            if (onError) {
              onError(new Error(transaction.resultDesc || 'Payment failed'));
            }
            
            if (onStatusChange) {
              onStatusChange('failed', { transaction, message: transaction.resultDesc });
            }
          }

          // Stop polling if we've reached max attempts
          if (attempts >= maxAttempts && status === 'PENDING') {
            clearInterval(pollingInterval);
            setPollingInterval(null);
            setPaymentStatus('failed');
            setError('Payment timeout. Please check your phone and try again.');
            
            if (onError) {
              onError(new Error('Payment timeout. Please check your phone and try again.'));
            }
            
            if (onStatusChange) {
              onStatusChange('timeout', { attempts, maxAttempts });
            }
          }
        }
      } catch (err) {
        console.error('❌ Polling error:', err);
        
        if (attempts >= maxAttempts) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
          setPaymentStatus('failed');
          setError('Failed to verify payment status');
          
          if (onError) {
            onError(err);
          }
          
          if (onStatusChange) {
            onStatusChange('polling_error', { error: err.message });
          }
        }
      }
    };

    // Start polling immediately and then every 5 seconds
    poll();
    const interval = setInterval(poll, 5000);
    setPollingInterval(interval);

    // Set timeout to stop polling after 5 minutes
    const timeoutId = setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        if (paymentStatus === 'processing' || paymentStatus === 'pending') {
          setPaymentStatus('failed');
          setError('Payment timeout. Please check your phone and try again.');
          if (onError) {
            onError(new Error('Payment timeout. Please check your phone and try again.'));
          }
        }
      }
    }, 300000); // 5 minutes

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [onSuccess, onError, onStatusChange, paymentStatus, pollingInterval]);

  // Initiate payment flow
  const initiatePaymentFlow = useCallback(async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError("Please enter a valid Kenyan phone number (e.g., 0712345678)");
      return;
    }

    if (amount < 1 || amount > 70000) {
      setError("Amount must be between KES 1 and KES 70,000");
      return;
    }

    if (!orderData?.items || orderData.items.length === 0) {
      setError("Order items are required");
      return;
    }

    setLoading(true);
    setError("");
    setPaymentStatus("processing");
    setPollingAttempts(0);

    if (onStatusChange) {
      onStatusChange('initiating');
    }

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('💰 Initiating payment flow:', {
        phoneNumber: formattedPhone ? '***' + formattedPhone.slice(-3) : 'none',
        amount,
        itemsCount: orderData.items.length
      });

      const response = await mpesaAPI.initiatePaymentFlow({
        phoneNumber: formattedPhone,
        amount: amount,
        orderData: {
          items: orderData.items,
          subtotal: orderData.subtotal,
          shippingCost: orderData.shippingCost,
          addressId: orderData.addressId,
          deliveryInstructions: orderData.deliveryInstructions
        }
      });

      if (response.data.success) {
        const checkoutID = response.data.checkoutRequestID;
        const orderID = response.data.orderId;
        
        setCheckoutRequestID(checkoutID);
        setOrderId(orderID);
        setPaymentStatus("pending");
        
        if (onStatusChange) {
          onStatusChange('initiated', {
            checkoutRequestID: checkoutID,
            orderId: orderID,
            message: response.data.message
          });
        }

        // Start polling for payment status
        startPaymentPolling(checkoutID, orderID);
        
        return {
          success: true,
          checkoutRequestID: checkoutID,
          orderId: orderID,
          message: response.data.message
        };
      } else {
        setError(response.data.error || "Failed to initiate payment");
        setPaymentStatus("failed");
        
        if (onError) {
          onError(new Error(response.data.error || "Failed to initiate payment"));
        }
        
        if (onStatusChange) {
          onStatusChange('initiation_failed', { error: response.data.error });
        }
        
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (err) {
      console.error('❌ Payment initiation error:', err);
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          "Payment initiation failed. Please try again.";
      
      setError(errorMessage);
      setPaymentStatus("failed");
      
      if (onError) {
        onError(err);
      }
      
      if (onStatusChange) {
        onStatusChange('error', { error: errorMessage });
      }
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [amount, phoneNumber, orderData, onError, onSuccess, onStatusChange, startPaymentPolling]);

  // Legacy initiate payment (for backward compatibility)
  const initiatePayment = useCallback(async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError("Please enter a valid Kenyan phone number");
      return;
    }

    if (amount < 1) {
      setError("Minimum payment amount is KES 1");
      return;
    }

    setLoading(true);
    setError("");
    setPaymentStatus("processing");
    setPollingAttempts(0);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await mpesaAPI.initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: amount,
        orderId: orderData?.orderId,
        accountReference: orderData?.orderId ? `ORDER-${orderData.orderId}` : `PAYMENT-${Date.now()}`,
        transactionDesc: orderData?.orderId ? `Payment for Order #${orderData.orderId}` : `Payment of KES ${amount}`
      });

      if (response.data.success) {
        const checkoutID = response.data.data?.CheckoutRequestID;
        setCheckoutRequestID(checkoutID);
        startPaymentPolling(checkoutID, orderData?.orderId);
      } else {
        setError(response.data.message || "Failed to initiate payment");
        setPaymentStatus("failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment initiation failed. Please try again.");
      setPaymentStatus("failed");
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [amount, orderData?.orderId, phoneNumber, onError, startPaymentPolling]);

  // Manually check payment status
  const checkStatus = useCallback(async () => {
    if (!checkoutRequestID) {
      setError("No payment in progress");
      return;
    }

    try {
      const response = await mpesaAPI.checkPaymentStatus(checkoutRequestID);
      return response.data;
    } catch (err) {
      console.error('❌ Manual status check error:', err);
      setError("Failed to check payment status");
      return null;
    }
  }, [checkoutRequestID]);

  // Reset payment state
  const reset = useCallback(() => {
    setPhoneNumber(initialPhone);
    setLoading(false);
    setError('');
    setPaymentStatus('idle');
    setCheckoutRequestID('');
    setOrderId('');
    setPollingAttempts(0);
    setPaymentDetails(null);
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [initialPhone, pollingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return {
    // State
    phoneNumber,
    setPhoneNumber,
    loading,
    error,
    paymentStatus,
    paymentDetails,
    checkoutRequestID,
    orderId,
    pollingAttempts,
    
    // Actions
    initiatePaymentFlow,
    initiatePayment, // Legacy
    checkStatus,
    reset,
    
    // Utilities
    formatDisplayPhone,
    validatePhoneNumber,
    
    // Status helpers
    isIdle: paymentStatus === 'idle',
    isProcessing: paymentStatus === 'processing',
    isPending: paymentStatus === 'pending',
    isCompleted: paymentStatus === 'completed',
    isFailed: paymentStatus === 'failed'
  };
};