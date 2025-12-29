// components/checkout/PlaceOrderButton.jsx
import React from 'react';

function PlaceOrderButton({
  selectedAddress,
  cartItemsCount,
  placingOrder,
  selectedPaymentMethod,
  totalAmount,
  deliveryEstimate,
  onPlaceOrder,
  onAddAddress,
  selectedAddressPhone,
  hasDeliveryInstructions = false
}) {
  const isDisabled = placingOrder;

  const getButtonText = () => {
    if (placingOrder) {
      if (selectedPaymentMethod === 'MPESA') return 'Processing MPESA Payment...';
      return 'Processing Order...';
    }
    if (!selectedAddress) return 'Add Delivery Address';
    if (cartItemsCount === 0) return 'Your Cart is Empty';
    if (selectedPaymentMethod === 'MPESA') return `Pay KES ${totalAmount.toFixed(2)} with MPESA`;
    return `Complete Order - KES ${totalAmount.toFixed(2)}`;
  };

  const getButtonColor = () => {
    if (isDisabled) return 'bg-gray-400 cursor-not-allowed';
    if (!selectedAddress) return 'bg-blue-600 hover:bg-blue-700';
    if (cartItemsCount === 0) return 'bg-yellow-600 hover:bg-yellow-700';
    if (selectedPaymentMethod === 'MPESA') return 'bg-blue-600 hover:bg-blue-700';
    return 'bg-green-600 hover:bg-green-700';
  };

  const handleClick = () => {
    if (placingOrder) return;

    if (!selectedAddress) {
      if (onAddAddress) {
        onAddAddress();
      }
      return;
    }

    if (cartItemsCount === 0) {
      window.location.href = '/products';
      return;
    }

    onPlaceOrder(selectedPaymentMethod);
  };

  return (
    <div className="border-t pt-6">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full py-4 rounded-lg font-semibold transition-colors shadow-sm text-lg ${getButtonColor()} text-white disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {placingOrder ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            {selectedPaymentMethod === 'MPESA' ? 'Processing MPESA Payment...' : 'Processing Order...'}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-bold">{getButtonText()}</span>
            {selectedAddress && cartItemsCount > 0 && (
              <span className="text-sm font-normal opacity-90 mt-1">
                {selectedPaymentMethod === 'MPESA' ? 'Pay with mobile money' : 'Cash on delivery'}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Additional Information */}
      {selectedAddress && cartItemsCount > 0 && !placingOrder && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Delivery estimate:</span>
            <span className="font-medium text-gray-900">{deliveryEstimate}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Payment method:</span>
            <span className="font-medium text-gray-900">
              {selectedPaymentMethod === 'MPESA' ? 'M-Pesa (Secure)' : 'Cash on Delivery'}
            </span>
          </div>

          {/* Delivery Instructions Indicator */}
          {hasDeliveryInstructions && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">📝</span>
                <span className="text-xs text-blue-700">
                  Delivery instructions added
                </span>
              </div>
            </div>
          )}

          {selectedPaymentMethod === 'MPESA' && !selectedAddressPhone && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-700 text-center">
                📱 Phone number will be requested for M-Pesa payment
              </p>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By placing your order, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      )}

      {!selectedAddress && !placingOrder && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 text-center">
            Click to add or select a delivery address
          </p>
        </div>
      )}

      {selectedAddress && cartItemsCount === 0 && !placingOrder && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700 text-center">
            Your cart is empty. Add items before placing order.
          </p>
        </div>
      )}
    </div>
  );
}

export default PlaceOrderButton;