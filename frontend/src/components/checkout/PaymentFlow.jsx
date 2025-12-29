// components/checkout/PaymentFlow.jsx
import React from 'react';

const PaymentFlow = ({ 
  step, 
  error, 
  onClose, 
  onRetry, 
  phoneNumber = '', 
  paymentMethod = 'MPESA'
}) => {
  if (!step) return null;

  // Helper to determine if it's COD
  const isCOD = paymentMethod === 'COD' || paymentMethod === 'CASH' || paymentMethod === 'CASH_ON_DELIVERY';

  const renderStep = () => {
    // Processing step - same for all payment methods
    if (step === 'processing') {
      return (
        <div className="text-center p-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-600 text-xl">💳</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isCOD ? 'Placing Your Order...' : 'Processing Your Payment...'}
          </h3>
          <p className="text-gray-600">
            {isCOD 
              ? 'Please wait while we process your cash on delivery order...' 
              : 'Please wait while we process your payment...'
            }
          </p>
          <div className="mt-4">
            <div className="h-1 w-32 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-600 animate-pulse"></div>
            </div>
          </div>
        </div>
      );
    }

    // MPESA Prompt - Only for MPESA payments
    if (step === 'mpesa_prompt' && !isCOD) {
      return (
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete MPESA Payment</h3>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="text-green-600 mr-3">💡</div>
              <div>
                <p className="text-green-800 font-medium text-sm mb-1">Check your phone</p>
                <p className="text-green-700 text-sm">
                  We've sent an MPESA prompt to <span className="font-semibold">{phoneNumber || 'your phone'}</span>.
                  Enter your MPESA PIN to complete the payment.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-xs">1</span>
              <span>Check your phone for "Safaricom" message</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-xs">2</span>
              <span>Enter your MPESA PIN when prompted</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-xs">3</span>
              <span>Wait for payment confirmation</span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This may take up to 60 seconds. Please don't close this window.
            </p>
          </div>
        </div>
      );
    }

    // Payment Complete - For MPESA payments only
    if (step === 'payment_complete' && !isCOD) {
      return (
        <div className="text-center p-6">
          <div className="relative">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-3xl">✅</span>
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <span className="text-2xl">🎉</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-4">Your MPESA payment was successful and order has been placed.</p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
            <p className="text-green-700 text-sm">
              You'll be redirected to your order confirmation shortly...
            </p>
          </div>
          
          {/* Auto-redirect timer */}
          <div className="mt-4">
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 animate-[progress_5s_linear]"></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Redirecting in 5 seconds...
            </p>
          </div>
        </div>
      );
    }

    // Order Complete - For COD payments only (changed from payment_complete)
    if (step === 'order_complete' && isCOD) {
      return (
        <div className="text-center p-6">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-3xl">📦</span>
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <span className="text-2xl">🎉</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Received! 🎉</h3>
          <p className="text-gray-600 mb-4">Your cash on delivery order has been placed successfully!</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-blue-700 text-sm">
              <span className="font-semibold">💰 Cash on Delivery:</span> You'll pay when your order arrives.
            </p>
            <p className="text-blue-700 text-sm mt-1">
              We'll contact you at <span className="font-semibold">{phoneNumber || 'your phone'}</span> for delivery updates.
            </p>
          </div>
          
          {/* Auto-redirect timer */}
          <div className="mt-4">
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 animate-[progress_5s_linear]"></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Redirecting to order confirmation...
            </p>
          </div>
        </div>
      );
    }

    // Error Step - For all payment methods
    if (step === 'payment_error') {
      return (
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isCOD ? 'Order Failed' : 'Payment Failed'}
            </h3>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-center">
              {error || (isCOD ? 'Failed to place your order. Please try again.' : 'There was an error processing your payment.')}
            </p>
          </div>
          
          {!isCOD && (
            <div className="space-y-3 mb-4">
              <p className="text-gray-600 text-sm font-medium">Possible reasons:</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Insufficient MPESA balance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Wrong MPESA PIN entered</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Network issues or timeout</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Incorrect phone number</span>
                </li>
              </ul>
            </div>
          )}
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={onRetry}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {isCOD ? 'Try Again' : 'Retry Payment'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Don't show close button on success or processing steps
  const showCloseButton = !['processing', 'payment_complete', 'order_complete'].includes(step);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full transform transition-all duration-300 scale-100">
        <div className="relative">
          {renderStep()}
          
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1"
              aria-label="Close"
            >
              <span className="text-xl w-6 h-6 flex items-center justify-center">×</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Add CSS animation for progress bar
const style = document.createElement('style');
style.textContent = `
  @keyframes progress {
    from { width: 0%; }
    to { width: 100%; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-\\[progress_5s_linear\\] {
    animation: progress 5s linear;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}

export default PaymentFlow;