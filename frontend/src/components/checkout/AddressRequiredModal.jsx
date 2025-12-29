// components/checkout/AddressRequiredModal.jsx
import React from 'react';

const AddressRequiredModal = ({ isOpen, onAddAddress, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            📍 Delivery Address Required
          </h3>
          <p className="text-gray-600 mb-6">
            You need to add a delivery address before you can complete your order.
            Would you like to add one now?
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={onAddAddress}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add Address
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressRequiredModal;