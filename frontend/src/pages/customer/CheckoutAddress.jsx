// pages/customer/CheckoutAddress.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { addressAPI } from '../../services/api';
import { cartAPI } from '../../services/api';
import NairobiAddressForm from '../../components/NairobiAddressForm';
import './CheckoutAddress.css';

export default function CheckoutAddress() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null); // ADD THIS STATE
  
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const returnTo = searchParams.get('return') || '/checkout';
  const source = searchParams.get('source') || '';

  // Debug logging
  console.log('📍 CheckoutAddress Loaded:', {
    returnTo,
    source,
    searchParams: Object.fromEntries([...searchParams]),
    pathname: location.pathname
  });

  // Fetch addresses and cart
  useEffect(() => {
    fetchAddresses();
    fetchCart();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await addressAPI.getAll();
      
      // Handle different response structures
      const addressesData = 
        response.data?.addresses || 
        response.data?.data?.addresses || 
        response.data || 
        response || 
        [];
      
      console.log('📍 Addresses fetched:', addressesData.length, 'addresses');
      setAddresses(Array.isArray(addressesData) ? addressesData : []);
      
      // Auto-select default address if exists
      const defaultAddress = addressesData.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        console.log('📍 Auto-selected default address:', defaultAddress.id);
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch addresses:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await cartAPI.get();
      console.log('🛒 Cart API response:', response);
      
      // Handle different cart response structures
      let items = [];
      let total = 0;
      
      if (response.data?.data?.items && Array.isArray(response.data.data.items)) {
        items = response.data.data.items;
        total = response.data.data.total || 0;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        items = response.data.items;
        total = response.data.total || 0;
      } else if (response.data?.data?.cart?.items) {
        items = response.data.data.cart.items;
        total = response.data.data.total || 0;
      }
      
      console.log('🛒 Cart items extracted:', items.length);
      setCartItems(Array.isArray(items) ? items : []);
      setCartTotal(total || 0);
    } catch (error) {
      console.error('❌ Failed to fetch cart:', error);
      setCartItems([]);
      setCartTotal(0);
    }
  };

  // Handle address selection
  const handleAddressSelect = async (address) => {
    console.log('📍 Address selected:', {
      addressId: address.id,
      addressLabel: address.label || address.street
    });
    
    try {
      // 1. Save to localStorage for persistence
      localStorage.setItem('selectedCheckoutAddress', JSON.stringify(address));
      console.log('✅ Address saved to localStorage');
      
      // 2. Try to set as default address
      try {
        await addressAPI.setDefault(address.id);
        console.log('✅ Address set as default');
      } catch (defaultError) {
        console.log('⚠️ Could not set as default:', defaultError);
      }
      
      // 3. Navigate back to checkout with address ID
      const checkoutURL = `/checkout?addressId=${address.id}&from=address`;
      console.log('📍 Navigating to:', checkoutURL);
      navigate(checkoutURL);
      
    } catch (error) {
      console.error('❌ Failed to select address:', error);
      alert('Failed to select address. Please try again.');
    }
  };

  // Handle "Continue to Checkout" button click
  const handleContinueToCheckout = () => {
    if (!selectedAddressId) {
      alert('Please select an address first');
      return;
    }
    
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (selectedAddress) {
      handleAddressSelect(selectedAddress);
    } else {
      alert('Selected address not found. Please select again.');
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await addressAPI.delete(id);
      // If deleting selected address, clear selection
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
      }
      fetchAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
      alert('Failed to delete address');
    }
  };

  const handleFormSuccess = (newAddress) => {
    setShowForm(false);
    setEditingAddress(null);
    fetchAddresses();
    
    // Auto-select the newly created address
    if (newAddress && newAddress.id) {
      setSelectedAddressId(newAddress.id);
      console.log('📍 Auto-selected newly created address:', newAddress.id);
    }
  };

  const handleCancel = () => {
    if (editingAddress) {
      setEditingAddress(null);
    }
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading addresses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Cart Summary Banner */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add Delivery Address</h2>
              <p className="text-gray-600">Select or add an address to continue checkout</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Your Order</div>
              <div className="text-lg font-bold text-gray-900">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} • KES {cartTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Cart Items Preview */}
        {cartItems.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Your Order Items</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {cartItems.map((item, index) => (
                <div key={item.id || index} className="flex items-center border-b border-gray-100 pb-3 last:border-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    {item.product?.image ? (
                      <img 
                        src={item.product.image} 
                        alt={item.product?.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-lg">💊</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.product?.name || item.name || 'Product'}
                    </p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    KES {((item.product?.price || item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/cart')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Back to Cart
              </button>
            </div>
          </div>
        )}

        {/* Address Form or Address List */}
        {showForm ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center mb-6">
              <button
                onClick={handleCancel}
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
              onSubmitSuccess={handleFormSuccess}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <>
            {/* Address List */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Your Addresses</h2>
                  <p className="text-gray-600">Select a delivery address or add a new one</p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  + Add New Address
                </button>
              </div>

              {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-blue-500'
                      } ${address.isDefault ? 'border-green-500' : ''}`}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center mb-1">
                            <input
                              type="radio"
                              name="selectedAddress"
                              checked={selectedAddressId === address.id}
                              onChange={() => {}}
                              className="h-4 w-4 text-blue-600 mr-2"
                            />
                            <h3 className="font-semibold text-gray-900">
                              {address.label || 'Delivery Address'}
                              {address.isDefault && (
                                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  Default
                                </span>
                              )}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{address.street}</p>
                          <p className="text-sm text-gray-600 ml-6">
                            {address.state}, {address.city}
                          </p>
                          {address.phone && (
                            <p className="text-sm text-gray-600 ml-6 mt-1">📱 {address.phone}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddress(address);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddressSelect(address);
                        }}
                        className={`w-full mt-3 py-2 rounded-lg font-semibold transition-colors ${
                          selectedAddressId === address.id
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                      >
                        {selectedAddressId === address.id ? '✓ Deliver Here' : 'Deliver Here'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses yet</h3>
                  <p className="text-gray-600 mb-6">Add your first delivery address to continue</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    + Add Your First Address
                  </button>
                </div>
              )}
            </div>

            {/* Continue Checkout Button */}
            {!showForm && addresses.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600">Ready to continue checkout?</p>
                    <p className="text-sm text-gray-500">
                      {selectedAddressId 
                        ? `Address selected: ${addresses.find(a => a.id === selectedAddressId)?.street.substring(0, 30)}...`
                        : 'No address selected yet'}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate('/checkout')}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Back to Checkout
                    </button>
                    <button
                      onClick={handleContinueToCheckout}
                      disabled={!selectedAddressId}
                      className={`px-8 py-2.5 rounded-lg font-semibold transition-colors ${
                        selectedAddressId
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Use Selected Address
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}