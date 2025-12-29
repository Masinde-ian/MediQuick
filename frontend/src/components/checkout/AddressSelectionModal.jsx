// components/checkout/AddressSelectionModal.jsx
import React, { useState, useEffect } from 'react';
import { addressAPI, cartAPI } from '../../services/api';
import NairobiAddressForm from '../NairobiAddressForm';

const AddressSelectionModal = ({ isOpen, onSelectAddress, onClose, onAddAddressClick }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
      fetchCart();
    }
  }, [isOpen]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await addressAPI.getAll();
      const addressesData = Array.isArray(response.data) ? response.data : 
                          Array.isArray(response) ? response : 
                          Array.isArray(response.data?.data) ? response.data.data :
                          Array.isArray(response.data?.addresses) ? response.data.addresses : [];
      setAddresses(addressesData);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await cartAPI.get();
      const items = Array.isArray(response.data) ? response.data :
                   Array.isArray(response.data?.items) ? response.data.items :
                   Array.isArray(response.data?.data?.items) ? response.data.data.items :
                   Array.isArray(response.data?.data?.cart?.items) ? response.data.data.cart.items : [];
      setCartItems(items);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      setCartItems([]);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading addresses...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show NairobiAddressForm inside modal when showForm is true
  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingAddress(null);
              }}
              className="text-gray-600 hover:text-gray-800 mr-4"
            >
              ← Back
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h2>
          </div>

          <NairobiAddressForm
            initialData={editingAddress}
            onSubmitSuccess={(newAddress) => {
              setShowForm(false);
              setEditingAddress(null);
              fetchAddresses();
              
              // Auto-select the newly created/updated address
              if (newAddress && onSelectAddress) {
                setTimeout(() => {
                  onSelectAddress(newAddress);
                }, 500);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingAddress(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select Delivery Address</h2>
              <p className="text-gray-600">Choose where to deliver your order</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Cart Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600">🛒</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{cartItems.length} items in cart</p>
                <p className="text-sm text-gray-600">Ready for checkout</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/cart'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Cart
            </button>
          </div>
        </div>

        {/* Address List */}
        <div className="flex-1 overflow-y-auto p-6">
          {addresses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses yet</h3>
              <p className="text-gray-600 mb-6">Add a delivery address to continue checkout</p>
              <button
                onClick={() => setShowForm(true)} // FIXED: Opens form inside modal
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                + Add Your First Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    address.isDefault ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
                  }`}
                  onClick={() => onSelectAddress(address)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {address.label || 'Delivery Address'}
                        {address.isDefault && (
                          <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{address.street}</p>
                      <p className="text-sm text-gray-600">
                        {address.state}, {address.city}
                      </p>
                      {address.phone && (
                        <p className="text-sm text-gray-600 mt-1">📱 {address.phone}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddress(address);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAddress(address);
                    }}
                    className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Deliver Here
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={() => setShowForm(true)} // FIXED: Opens form inside modal
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              + Add New Address
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressSelectionModal;