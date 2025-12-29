// components/checkout/PaymentMethodSection.jsx - UPDATED
import React, { useState, useEffect } from 'react';

export default function PaymentMethodSection({
  selectedPaymentMethod: propSelectedPaymentMethod = 'COD',
  onSelectPaymentMethod = () => {},
  selectedAddress
}) {
  const [localSelectedMethod, setLocalSelectedMethod] = useState(propSelectedPaymentMethod);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync with parent prop
  useEffect(() => {
    setLocalSelectedMethod(propSelectedPaymentMethod);
  }, [propSelectedPaymentMethod]);

  const handlePaymentSelect = async (method) => {
    console.log('💳 PaymentMethodSection: Selecting method:', method);
    
    // Set local state immediately for UI feedback
    setLocalSelectedMethod(method);
    
    // For MPESA, check if phone is available
    if (method === 'MPESA') {
      const hasPhone = selectedAddress?.phone && selectedAddress.phone.length >= 10;
      
      if (!hasPhone) {
        console.log('📱 No phone number available for MPESA');
        // Don't change the actual selection - let parent handle it
        setLocalSelectedMethod(propSelectedPaymentMethod); // Revert to previous
        onSelectPaymentMethod('MPESA'); // Still notify parent to show phone modal
        return;
      }
    }
    
    // Notify parent of selection
    onSelectPaymentMethod(method);
  };

  // Payment methods data
  const paymentMethods = [
    {
      id: 'COD',
      name: 'Cash on Delivery',
      description: 'Pay when you receive your order',
      icon: '💰',
      color: 'green',
      available: true,
      features: [
        'No payment upfront',
        'Pay cash on delivery',
        'Available nationwide'
      ]
    },
    {
      id: 'MPESA',
      name: 'MPESA',
      description: 'Pay instantly via Safaricom MPESA',
      icon: '📱',
      color: 'blue',
      available: !!selectedAddress?.phone,
      features: [
        'Instant payment',
        'Secure transaction',
        'Mobile money convenience'
      ]
    }
  ];

  // Check if MPESA should be disabled
  const isMpesaDisabled = !selectedAddress?.phone || selectedAddress.phone.length < 10;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
          <p className="text-gray-600 mt-1">Choose how you want to pay</p>
        </div>
        <div className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
          Step 2 of 3
        </div>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => {
          const isSelected = localSelectedMethod === method.id;
          const isDisabled = method.id === 'MPESA' ? isMpesaDisabled : !method.available;
          
          return (
            <div
              key={method.id}
              onClick={() => !isDisabled && handlePaymentSelect(method.id)}
              className={`relative rounded-xl p-5 transition-all duration-200 cursor-pointer border-2 ${
                isSelected
                  ? `border-${method.color}-500 bg-${method.color}-50 ring-2 ring-${method.color}-200`
                  : isDisabled
                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <div className="flex items-start">
                {/* Selection indicator */}
                <div className="mr-4 flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? `border-${method.color}-500 bg-${method.color}-500`
                      : isDisabled
                        ? 'border-gray-300'
                        : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Icon */}
                <div className={`mr-4 p-3 rounded-lg ${
                  isSelected ? `bg-${method.color}-100` : 'bg-gray-100'
                }`}>
                  <span className="text-2xl">{method.icon}</span>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        isDisabled ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {method.name}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        isDisabled ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {method.description}
                      </p>
                    </div>
                    
                    {/* Status badges */}
                    {isSelected && (
                      <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium bg-${method.color}-100 text-${method.color}-800`}>
                        Selected
                      </span>
                    )}
                  </div>
                  
                  {/* Features list */}
                  {method.features && (
                    <ul className="mt-3 space-y-1">
                      {method.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-500 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Warning for MPESA without phone */}
                  {method.id === 'MPESA' && isMpesaDisabled && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-yellow-800">
                          Add a phone number to your address to use MPESA
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment method info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure Payment Guarantee
          </h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Your payment information is encrypted and secure</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>We never store your MPESA PIN or payment credentials</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Money-back guarantee if you don't receive your order</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Selected method info */}
      {localSelectedMethod && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-lg">💡</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">
                {localSelectedMethod === 'COD' 
                  ? 'You selected Cash on Delivery. You\'ll pay when your order arrives.'
                  : 'You selected MPESA. You\'ll receive a payment prompt on your phone.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}