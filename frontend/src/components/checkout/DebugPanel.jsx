// src/components/checkout/DebugPanel.jsx
import React from 'react';

const DebugPanel = ({ 
  mountCount, 
  addresses, 
  cartItems, 
  cartTotal, 
  fromAddressPage, 
  returnParam, 
  onRefresh 
}) => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="mb-4 p-3 bg-gray-100 rounded-lg border border-gray-300 text-xs text-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <p><strong>Debug Info:</strong></p>
          <p>• Mounted: {mountCount}x</p>
          <p>• Addresses: {addresses} | Cart: {cartItems} items</p>
          <p>• Total: KES {cartTotal?.toFixed(2) || '0.00'}</p>
          <p>• From address page: {fromAddressPage ? 'Yes' : 'No'}</p>
          <p>• Return param: {returnParam || 'None'}</p>
        </div>
        <div className="space-x-2">
          <button 
            onClick={onRefresh}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;