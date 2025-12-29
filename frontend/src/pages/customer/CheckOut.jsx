// pages/customer/Checkout.jsx - FIXED VERSION
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckout } from '../../hooks/useCheckout';
import CartPreview from '../../components/checkout/CartPreview';
import AddressSection from '../../components/checkout/AddressSection';
import OrderSummary from '../../components/checkout/OrderSummary';
import ShippingOptions from '../../components/checkout/ShippingOptions';
import PaymentMethodSection from '../../components/checkout/PaymentMethodSection';
import PlaceOrderButton from '../../components/checkout/PlaceOrderButton';
import PhoneInputModal from '../../components/checkout/PhoneInputModal';
import AddressSelectionModal from '../../components/checkout/AddressSelectionModal';
import ProgressSteps from '../../components/checkout/ProgressSteps';
import HelpSupportSection from '../../components/checkout/HelpSupportSection';
import PaymentFlow from '../../components/checkout/PaymentFlow';
import AddressRequiredModal from '../../components/checkout/AddressRequiredModal';
import DeliveryInstructions from '../../components/checkout/DeliveryInstructions';

export default function Checkout() {
  const navigate = useNavigate();
  
  const {
    cart, 
    addresses, 
    selectedAddress, 
    shippingOptions, 
    selectedShipping,
    selectedPaymentMethod, 
    loading, 
    placingOrder,
    paymentStep, 
    paymentError, 
    showPhoneModal, 
    total,
    cartItemsCount,
    subtotal,
    shippingPrice,
    deliveryInstructions,
    handleSelectAddress,
    handleSelectShipping, 
    handlePlaceOrder, 
    setSelectedPaymentMethod,
    handlePhoneModalSubmit,
    handleDeliveryInstructionsChange,
    handlePaymentRetry,
    handlePaymentFlowClose,
    showAddressRequiredModal,
    setShowAddressRequiredModal,
    getDeliveryEstimate,
    setShowPhoneModal
  } = useCheckout();

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Auto-open address modal if no address selected
  useEffect(() => {
    if (!loading && !selectedAddress && cartItemsCount > 0 && !initialized) {
      const timer = setTimeout(() => {
        setShowAddressModal(true);
        setInitialized(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedAddress, cartItemsCount, initialized]);

  // Handle navigate to address page
  const handleNavigateToAddressPage = () => {
    setShowAddressModal(false);
    navigate('/checkout/address?return=/checkout&source=checkout');
  };

  // Handle address modal select
  const handleAddressModalSelect = (address) => {
    handleSelectAddress(address);
    setShowAddressModal(false);
  };

  // Handle open address modal from buttons
  const handleOpenAddressModal = () => {
    setShowAddressModal(true);
  };

  // Handle place order with validation
  const handlePlaceOrderWithValidation = () => {
    if (!selectedAddress) {
      setShowAddressRequiredModal(true);
      return;
    }
    
    if (cartItemsCount === 0) {
      alert('Your cart is empty. Please add items before placing an order.');
      navigate('/products');
      return;
    }
    
    handlePlaceOrder(selectedPaymentMethod);
  };

  // Handle phone modal close
  const handlePhoneModalClose = () => {
    setShowPhoneModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Payment Flow Modal */}
      {paymentStep && (
        <PaymentFlow
          step={paymentStep}
          error={paymentError}
          onClose={handlePaymentFlowClose}
          onRetry={handlePaymentRetry}
          phoneNumber={selectedAddress?.phone}
          paymentMethod={selectedPaymentMethod} // ✅ ADD THIS PROP
        />
      )}

      {/* Address Required Modal */}
      <AddressRequiredModal
        isOpen={showAddressRequiredModal}
        onAddAddress={handleOpenAddressModal}
        onClose={() => setShowAddressRequiredModal(false)}
      />

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={showAddressModal}
        onSelectAddress={handleAddressModalSelect}
        onClose={() => setShowAddressModal(false)}
        onAddAddressClick={handleNavigateToAddressPage}
      />

      {/* Phone Input Modal */}
      <PhoneInputModal 
        isOpen={showPhoneModal} 
        onSubmit={handlePhoneModalSubmit} 
        onClose={handlePhoneModalClose}
        initialPhone={selectedAddress?.phone}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase with secure checkout</p>
        </div>

        {/* Progress Steps */}
        <ProgressSteps selectedAddress={selectedAddress} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Checkout Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Preview */}
            <CartPreview 
              items={cart.items || []} 
              selectedAddress={selectedAddress}
            />

            {/* Address Section */}
            <AddressSection 
              selectedAddress={selectedAddress} 
              addresses={addresses} 
              onAddAddress={handleOpenAddressModal}
              onSelectAddress={handleSelectAddress}
            />

            {/* Delivery Instructions (Only if address selected) */}
            {selectedAddress && cartItemsCount > 0 && (
              <DeliveryInstructions 
                instructions={deliveryInstructions}
                onInstructionsChange={handleDeliveryInstructionsChange}
              />
            )}

            {/* Shipping Options (Only if address selected) */}
            {selectedAddress && cartItemsCount > 0 && shippingOptions && (
              <ShippingOptions 
                options={shippingOptions} 
                selected={selectedShipping?.id} 
                onSelect={handleSelectShipping}
                isLoading={false}
                cartTotal={subtotal || 0}
              />
            )}

            {/* Payment Method (Only if address selected) */}
            {selectedAddress && cartItemsCount > 0 && (
              <PaymentMethodSection 
                selectedPaymentMethod={selectedPaymentMethod} 
                onSelectPaymentMethod={setSelectedPaymentMethod}
                selectedAddress={selectedAddress}
              />
            )}

            {/* Place Order Button */}
            <div className="bg-white rounded-lg shadow p-6">
              <PlaceOrderButton 
                selectedAddress={selectedAddress}
                cartItemsCount={cartItemsCount}
                placingOrder={placingOrder}
                selectedPaymentMethod={selectedPaymentMethod}
                totalAmount={total}
                onPlaceOrder={handlePlaceOrderWithValidation}
                onAddAddress={handleOpenAddressModal}
                deliveryEstimate={getDeliveryEstimate()}
                selectedAddressPhone={selectedAddress?.phone}
                hasDeliveryInstructions={!!deliveryInstructions}
              />
            </div>

            {/* Help & Support */}
            <HelpSupportSection />
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="sticky top-6">
              <OrderSummary 
                items={cart.items || []}
                subtotal={subtotal || 0}
                shippingPrice={shippingPrice || 0}
                total={total}
                hasAddress={!!selectedAddress}
                isLoading={false}
                deliveryInstructions={deliveryInstructions}
              />

              {/* Security & Guarantee Banner */}
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Secure Checkout</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Secure SSL encryption</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Your data is protected</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>No hidden fees</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Money-back guarantee</span>
                  </div>
                </div>
              </div>

              {/* Need Help Section */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Our support team is here to assist you with your order.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate('/contact')}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => navigate('/faq')}
                    className="flex-1 border border-blue-600 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-50"
                  >
                    View FAQ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Return to Cart Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/cart')}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center mx-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Return to Cart
          </button>
        </div>
      </div>
    </div>
  );
}