// components/checkout/CartPreview.jsx
import React from 'react';

function CartPreview({ items = [], selectedAddress }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p className="text-gray-500 text-center">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-3">Your Cart ({items.length} items)</h3>
      <ul className="space-y-2">
        {items.map((item) => {
          // Safely get price and name
          const price = item.price ?? item.product?.price ?? 0;
          const name = item.product?.name ?? item.name ?? 'Unnamed Product';
          const quantity = item.quantity ?? 1;

          return (
            <li key={item.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-sm text-gray-500">
                  Qty: {quantity} x KES {price.toFixed(2)}
                </p>
              </div>
              <div className="font-semibold">
                KES {(price * quantity).toFixed(2)}
              </div>
            </li>
          );
        })}
      </ul>

      {selectedAddress && (
        <p className="mt-3 text-sm text-gray-600">
          Delivering to: {selectedAddress.street}, {selectedAddress.city}
        </p>
      )}
    </div>
  );
}

export default CartPreview;
