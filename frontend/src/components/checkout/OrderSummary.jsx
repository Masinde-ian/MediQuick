// components/checkout/OrderSummary.jsx
import React from 'react';

export default function OrderSummary({
  items = [],
  subtotal = 0,
  shippingPrice = 0,
  total = 0,
  hasAddress = false,
  isLoading = false,
  deliveryInstructions = ''
}) {
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-gray-500 text-center">Calculating totals...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.name} x {item.quantity}</span>
            <span>KES {(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <hr className="my-2" />
      <div className="flex justify-between font-medium">
        <span>Subtotal</span>
        <span>KES {subtotal.toFixed(2)}</span>
      </div>
      {hasAddress && (
        <div className="flex justify-between font-medium">
          <span>Shipping</span>
          <span>{shippingPrice === 0 ? 'FREE' : `KES ${shippingPrice.toFixed(2)}`}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg mt-2">
        <span>Total</span>
        <span>KES {total.toFixed(2)}</span>
      </div>

      {/* Delivery Instructions Preview */}
      {deliveryInstructions && (
        <>
          <hr className="my-3" />
          <div className="mt-2">
            <h4 className="font-medium text-gray-700 mb-2">Delivery Instructions:</h4>
            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
              {deliveryInstructions}
            </p>
          </div>
        </>
      )}
    </div>
  );
}