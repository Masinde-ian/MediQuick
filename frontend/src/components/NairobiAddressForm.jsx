// components/NairobiAddressForm.jsx - COMPLETE FIXED VERSION
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function NairobiAddressForm({ 
  onAddressSelect = null, 
  selectedAddress = null, 
  user = null, 
  redirectToCheckout = false, 
  cartTotal = 0 
}) {
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shippingInfo, setShippingInfo] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Add refs to prevent duplicate calls
  const hasFetched = useRef(false);
  const isCalculatingShipping = useRef(false);
  const formMounted = useRef(0);

  const [formData, setFormData] = useState({
    street: "",
    city: "Nairobi",
    state: "",
    zipCode: "",
    country: "Kenya",
    isDefault: false
  });

  // Nairobi estates organized by zones
  const nairobiZones = {
    "CBD": ["CBD", "Upper Hill", "Westlands CBD", "Parklands", "Kilimani CBD", "Industrial Area", "Ngong Road CBD"],
    "WEST": ["Westlands", "Lavington", "Kileleshwa", "Runda", "Muthaiga", "Gigiri", "Ridgeways", "Spring Valley"],
    "SOUTH": ["Karen", "Langata", "Adams Arcade", "Nyayo Estate", "South B", "South C", "Madaraka", "Nairobi West"],
    "EAST": ["Eastleigh", "Embakasi", "Donholm", "Buruburu", "Umoja", "Kariobangi", "Dandora", "Kayole"],
    "OUTSKIRTS": ["Ruiru", "Juja", "Thika", "Athi River", "Kitengela", "Ongata Rongai", "Kiserian", "Ngong"],
    "OTHER": ["Kawangware", "Dagoretti", "Kibera", "Mathare", "Hurlingham", "Mountain View", "Baba Dogo", "Kangemi"]
  };

  // Safe address selection handler
  const safeAddressSelect = (address) => {
    console.log('🎯 Attempting to select address:', address);
    
    if (typeof onAddressSelect === 'function') {
      console.log('✅ onAddressSelect is a function, calling it');
      onAddressSelect(address);
    } else {
      console.warn('⚠️ onAddressSelect is not a function or undefined');
      console.log('📝 Address would have been selected:', address);
      
      // Store in localStorage as fallback
      try {
        localStorage.setItem('selectedAddress', JSON.stringify(address));
        console.log('💾 Saved address to localStorage');
      } catch (error) {
        console.error('❌ Failed to save to localStorage:', error);
      }
    }
  };

  // Debug mounting
  useEffect(() => {
    formMounted.current += 1;
    console.log(`🏠 NairobiAddressForm MOUNTED #${formMounted.current}`);
    
    return () => {
      console.log(`🗑️ NairobiAddressForm UNMOUNTED #${formMounted.current}`);
    };
  }, []);

  // Check URL params for redirect
  useEffect(() => {
    const returnToCheckout = searchParams.get('return') === 'checkout';
    if (returnToCheckout) {
      console.log('🔗 Coming from checkout, will redirect back after saving');
    }
  }, [searchParams]);

  // Local shipping calculation
  const calculateShippingLocal = (area, total = 0) => {
    if (!area) return null;
    
    const areaLower = area.toLowerCase();
    let zone = 'OTHER';
    let basePrice = 300;
    let minOrder = 3000;
    let days = 1;

    // Determine zone
    if (areaLower.includes('cbd') || areaLower.includes('upper hill') || areaLower.includes('westlands cbd')) {
      zone = 'CBD';
      basePrice = 150;
      minOrder = 3000;
      days = 1;
    } else if (areaLower.includes('westlands') || areaLower.includes('lavington') || areaLower.includes('kileleshwa')) {
      zone = 'WEST';
      basePrice = 200;
      minOrder = 2500;
      days = 1;
    } else if (areaLower.includes('karen') || areaLower.includes('langata') || areaLower.includes('south')) {
      zone = 'SOUTH';
      basePrice = 250;
      minOrder = 2500;
      days = 1;
    } else if (areaLower.includes('eastleigh') || areaLower.includes('embakasi') || areaLower.includes('buruburu')) {
      zone = 'EAST';
      basePrice = 250;
      minOrder = 2000;
      days = 1;
    } else if (areaLower.includes('ruiru') || areaLower.includes('kitengela') || areaLower.includes('rongai')) {
      zone = 'OUTSKIRTS';
      basePrice = 350;
      minOrder = 5000;
      days = 2;
    }

    const isFree = total >= minOrder;
    
    return {
      zone,
      totalShipping: isFree ? 0 : basePrice,
      isFree,
      minOrderAmount: minOrder,
      estimatedDeliveryDays: days,
      description: `${zone} Zone Delivery`,
      canSameDay: ['CBD', 'WEST', 'SOUTH'].includes(zone),
      canExpress: ['CBD', 'WEST'].includes(zone)
    };
  };

  useEffect(() => {
    // Prevent duplicate calls
    if (hasFetched.current) {
      console.log('🔄 Skipping duplicate fetch, already fetched');
      return;
    }
    hasFetched.current = true;
    
    fetchAddresses();
  }, []);

  useEffect(() => {
    // Debounce shipping calculation
    if (!formData.state || isCalculatingShipping.current) return;
    
    isCalculatingShipping.current = true;
    const timer = setTimeout(() => {
      calculateShippingPreview(formData.state);
      isCalculatingShipping.current = false;
    }, 300);
    
    return () => clearTimeout(timer);
  }, [formData.state, cartTotal]);

  const fetchAddresses = async () => {
    try {
      console.log("🔄 NairobiAddressForm: Fetching addresses from API...");
      setLoading(true);
      
      const response = await api.get("/addresses");
      console.log("📦 Raw addresses response:", response.data);
      
      let addressesData = response.data?.data || response.data || [];
      
      // Handle different response structures
      if (addressesData && typeof addressesData === 'object' && !Array.isArray(addressesData)) {
        if (addressesData.addresses && Array.isArray(addressesData.addresses)) {
          addressesData = addressesData.addresses;
          console.log('📦 Extracted addresses from "addresses" key');
        } else if (addressesData.items && Array.isArray(addressesData.items)) {
          addressesData = addressesData.items;
          console.log('📦 Extracted addresses from "items" key');
        } else {
          // Try to extract any array-like data
          addressesData = Object.values(addressesData).filter(item => 
            item && typeof item === 'object' && (item.street || item.state)
          );
          console.log('📦 Extracted addresses from object values');
        }
      }
      
      if (!Array.isArray(addressesData)) {
        console.log('⚠️ Addresses data is not an array, setting empty:', addressesData);
        addressesData = [];
      }
      
      console.log(`🏠 Fetched ${addressesData.length} addresses:`, addressesData);
      setAddresses(addressesData);
      
      // Auto-select default address only if we have addresses
      if (addressesData.length > 0 && !selectedAddress) {
        const defaultAddress = addressesData.find(addr => addr.isDefault) || addressesData[0];
        console.log('✅ Auto-selecting default address:', defaultAddress);
        // Use safe handler instead of direct call
        safeAddressSelect(defaultAddress);
      } else if (addressesData.length === 0) {
        console.log('📭 No addresses found in database');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch addresses:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      
      // Handle 401 unauthorized
      if (error.response?.status === 401) {
        console.log('🔐 Authentication required for addresses');
        // Don't show error, just set empty array
      }
      
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateShippingPreview = async (estate) => {
    console.log('🚚 Calculating shipping for:', estate, 'Cart total:', cartTotal);
    try {
      // Try API first
      const response = await api.post('/shipping/calculate', {
        state: estate,
        cartTotal: cartTotal
      });
      console.log('📦 API shipping response:', response.data);
      setShippingInfo(response.data.data);
    } catch (error) {
      console.log('⚠️ Using local shipping calculation for:', estate);
      // Fallback to local calculation
      const localShipping = calculateShippingLocal(estate, cartTotal);
      console.log('📦 Local shipping calculation:', localShipping);
      setShippingInfo(localShipping);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('💾 Submitting address form:', formData);
    setSaving(true);
    
    try {
      console.log('📤 Sending POST to /addresses with data:', formData);
      const response = await api.post("/addresses", formData);
      console.log('✅ Address saved successfully! Response:', response.data);
      console.log('💾 Saved address details:', response.data.data);
      
      // IMPORTANT: Refresh addresses list
      console.log('🔄 Refreshing addresses list after save...');
      await fetchAddresses();
      
      // Auto-select the new address using safe handler
      if (response.data.data) {
        console.log('🎯 Auto-selecting newly saved address:', response.data.data);
        safeAddressSelect(response.data.data);
      }
      
      // Reset form
      setFormData({
        street: "",
        city: "Nairobi",
        state: "",
        zipCode: "",
        country: "Kenya",
        isDefault: false
      });
      setShowForm(false);
      
      // Check if we should redirect back to checkout
      const returnToCheckout = searchParams.get('return') === 'checkout';
      console.log('🔗 Redirect to checkout?', returnToCheckout);
      
      if (redirectToCheckout || returnToCheckout) {
        console.log('🔄 Redirecting to checkout in 1 second...');
        setTimeout(() => {
          console.log('🚀 Navigating to /checkout');
          navigate('/checkout');
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Failed to save address:', error);
      console.error('❌ Error response:', error.response?.data);
      alert(`Failed to save address: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const deleteAddress = async (addressId) => {
    console.log('🗑️ Deleting address:', addressId);
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      console.log('📤 Sending DELETE to /addresses/' + addressId);
      await api.delete(`/addresses/${addressId}`);
      console.log('✅ Address deleted successfully');
      await fetchAddresses();
      
      if (selectedAddress?.id === addressId) {
        console.log('🗑️ Clearing selected address');
        safeAddressSelect(null);
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
      alert('Failed to delete address. Please try again.');
    }
  };

  const setDefaultAddress = async (addressId) => {
    console.log('⭐ Setting default address:', addressId);
    try {
      await api.patch(`/addresses/${addressId}/default`);
      console.log('✅ Default address set successfully');
      await fetchAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
      alert('Failed to set default address. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading your addresses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug info - remove in production */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
        <p><strong>Debug Info:</strong></p>
        <p>• Form mounted: {formMounted.current} times</p>
        <p>• Addresses loaded: {addresses.length}</p>
        <p>• Selected address: {selectedAddress?.id || 'None'}</p>
        <p>• Redirect to checkout: {redirectToCheckout ? 'Yes' : 'No'}</p>
        <p>• onAddressSelect type: {typeof onAddressSelect}</p>
      </div>

      {/* Saved Addresses */}
      {addresses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Saved Addresses 📍 ({addresses.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`border-2 rounded-lg p-4 transition-all ${
                  selectedAddress?.id === address.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-300 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">
                      {address.state || "Nairobi Address"}
                    </span>
                    {address.isDefault && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-2xl">🏠</div>
                </div>
                
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    console.log('🎯 Selecting address via click:', address);
                    safeAddressSelect(address);
                  }}
                >
                  <p className="text-gray-700 text-sm mb-1">{address.street}</p>
                  <p className="text-gray-600 text-sm">
                    {address.state}, {address.city}
                  </p>
                  {address.zipCode && (
                    <p className="text-gray-500 text-xs mt-1">Postal: {address.zipCode}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-2">ID: {address.id}</p>
                </div>

                {/* Address Actions */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        console.log('🎯 Selecting address via button:', address);
                        safeAddressSelect(address);
                      }}
                      className={`text-xs px-3 py-1 rounded ${
                        selectedAddress?.id === address.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedAddress?.id === address.id ? 'Selected' : 'Select'}
                    </button>
                    
                    {!address.isDefault && (
                      <button
                        onClick={() => setDefaultAddress(address.id)}
                        className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => deleteAddress(address.id)}
                    className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Address Button */}
      {!showForm && addresses.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-4xl mb-4">🏠</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Addresses Saved Yet
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Add your delivery address to continue. Your addresses will be saved for future orders.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Your First Address
          </button>
        </div>
      )}

      {!showForm && addresses.length > 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
        >
          <span className="text-xl">+</span>
          <span>Add New Address</span>
        </button>
      )}

      {/* Add Address Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {addresses.length === 0 ? 'Add Your First Address' : 'Add New Address'}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <span>📍</span>
              <span>Nairobi Delivery</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Estate/Area Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estate/Area *
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select your estate</option>
                {Object.entries(nairobiZones).map(([zone, areas]) => (
                  <optgroup key={zone} label={zone}>
                    {areas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                required
                placeholder="e.g., Muthithi Road, House No. 42, Building Name"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  disabled
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 00100"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                disabled
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            {/* Default Address Toggle */}
            {addresses.length > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Set as default delivery address
                  </label>
                  <p className="text-xs text-gray-500">
                    This address will be selected automatically for future orders
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Preview */}
            {formData.state && shippingInfo && (
              <div className={`p-4 rounded-lg border ${
                shippingInfo.isFree 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      Shipping to {formData.state}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Zone: {shippingInfo.zone} • {shippingInfo.estimatedDeliveryDays} day delivery
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      shippingInfo.isFree ? 'text-green-700' : 'text-blue-700'
                    }`}>
                      {shippingInfo.isFree ? 'FREE' : `KES ${shippingInfo.totalShipping}`}
                    </p>
                    {!shippingInfo.isFree && shippingInfo.minOrderAmount > 0 && (
                      <p className="text-xs text-gray-600">
                        Free shipping on orders over KES {shippingInfo.minOrderAmount}
                      </p>
                    )}
                  </div>
                </div>
                
                {!shippingInfo.isFree && shippingInfo.minOrderAmount > cartTotal && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, (cartTotal / shippingInfo.minOrderAmount) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-xs text-gray-600 whitespace-nowrap">
                        Add KES {(shippingInfo.minOrderAmount - cartTotal).toFixed(2)} more for free shipping
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  `Save Address${redirectToCheckout ? ' & Continue' : ''}`
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Delivery Info Note */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">💡</span>
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Delivery Information
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  • Same-day delivery for orders before 2 PM in CBD & Westlands<br/>
                  • Next-day delivery for other areas<br/>
                  • Free shipping on orders over KES 3,000 in most zones
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}