import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext"; // Import CartContext
import api from "../../services/api";

export default function Cart() {
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const { user, isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  
  // Use CartContext instead of local state
  const { 
    cart, 
    loading: cartLoading, 
    fetchCart, 
    updateQuantity: updateQuantityInContext,
    removeItem: removeItemInContext,
    clearCart: clearCartInContext 
  } = useCart();

  // Extract cart data from context
  const items = cart?.items || [];
  const total = cart?.total || 0;
  const subtotal = cart?.subtotal || 0;
  const itemCount = cart?.itemCount || 0;

  // Combine loading states
  const loading = !authChecked || cartLoading;

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      // Cart is already fetched by CartContext, but we can refresh if needed
      console.log("🛒 Cart page mounted, cart from context:", cart);
    }
  }, [authChecked, isAuthenticated, cart]);

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      await handleRemoveItem(itemId);
      return;
    }

    setUpdatingItems(prev => new Set(prev).add(itemId));
    
    try {
      console.log(`🔄 Updating item ${itemId} to quantity ${newQuantity}`);
      
      // Use context function
      const result = await updateQuantityInContext(itemId, newQuantity);
      
      if (!result.success) {
        alert("Failed to update quantity. Please try again.");
      }
      
    } catch (error) {
      console.error("❌ Failed to update quantity:", error);
      alert("Failed to update quantity. Please try again.");
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to remove this item from your cart?")) {
      return;
    }

    setUpdatingItems(prev => new Set(prev).add(itemId));
    
    try {
      console.log(`🗑️ Removing item ${itemId}`);
      
      // Use context function
      const result = await removeItemInContext(itemId);
      
      if (!result.success) {
        alert("Failed to remove item. Please try again.");
      }
      
    } catch (error) {
      console.error("❌ Failed to remove item:", error);
      alert("Failed to remove item. Please try again.");
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Are you sure you want to clear your entire cart?")) {
      return;
    }

    try {
      // Use context function
      const result = await clearCartInContext();
      
      if (!result.success) {
        alert("Failed to clear cart. Please try again.");
      }
    } catch (error) {
      console.error("❌ Failed to clear cart:", error);
      alert("Failed to clear cart. Please try again.");
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert("Your cart is empty. Add items before checkout.");
      return;
    }

    // Force refresh cart before navigating to ensure latest data
    console.log("🔄 Refreshing cart before checkout...");
    await fetchCart();
    
    // Small delay to ensure state is updated
    setTimeout(() => {
      console.log("➡️ Navigating to checkout with cart:", cart);
      navigate('/checkout');
    }, 100);
  };

  const calculateItemTotal = (item) => {
    const price = item.product?.salePrice || item.product?.price || item.price || 0;
    const quantity = item.quantity || 1;
    return price * quantity;
  };

  const isItemUpdating = (itemId) => {
    return updatingItems.has(itemId);
  };

  // Show loading while auth is being checked or cart is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {!authChecked ? "Checking authentication..." : "Loading your cart..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt when user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-6">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please log in to view your shopping cart and manage your items.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
              >
                Login to Your Account
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-200"
              >
                Create New Account
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Continue shopping without an account?</p>
              <Link 
                to="/categories" 
                className="text-blue-600 hover:text-blue-700 font-medium transition duration-200"
              >
                Browse Products →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-2">
              {itemCount} item{itemCount !== 1 ? 's' : ''} in your cart
            </p>
          </div>
          
          {itemCount > 0 && (
            <button
              onClick={handleClearCart}
              className="px-4 py-2 text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg hover:bg-red-50 transition duration-200"
            >
              Clear Cart
            </button>
          )}
        </div>

        {itemCount === 0 ? (
          // Empty Cart State
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any products to your cart yet. Start shopping to find amazing deals!
            </p>
            <Link 
              to="/categories" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
            >
              <span>Start Shopping</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        ) : (
          // Cart with Items
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Cart Items</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => {
                    const itemId = item.id || `item-${index}`;
                    const isUpdating = isItemUpdating(itemId);
                    const itemTotal = calculateItemTotal(item);
                    const product = item.product || {};
                    
                    return (
                      <div 
                        key={itemId} 
                        className={`flex items-start space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition duration-200 ${
                          isUpdating ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Product Image */}
                        <Link 
                          to={`/products/${product.slug || product.id}`}
                          className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition duration-200"
                        >
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/products/${product.slug || product.id}`}
                            className="hover:text-blue-600 transition duration-200"
                          >
                            <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                              {product.name || item.name || 'Product'}
                            </h3>
                          </Link>
                          
                          <div className="flex items-center space-x-3 mb-2">
                            <p className="text-blue-600 font-bold text-lg">
                              KES {product.salePrice || product.price || item.price || 0}
                            </p>
                            {product.originalPrice && product.originalPrice > (product.salePrice || product.price || 0) && (
                              <p className="text-gray-500 text-sm line-through">
                                KES {product.originalPrice}
                              </p>
                            )}
                          </div>

                          {product.prescriptionRequired && (
                            <span className="inline-flex items-center text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                              💊 Prescription Required
                            </span>
                          )}
                          
                          {/* Display product ID for debugging */}
                          {process.env.NODE_ENV === 'development' && (
                            <p className="text-xs text-gray-400 mt-1">ID: {product.id || item.productId}</p>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex flex-col items-end space-y-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(itemId, (item.quantity || 1) - 1)}
                              disabled={isUpdating || (item.quantity || 1) <= 1}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                            >
                              {isUpdating ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <span className="text-gray-600">−</span>
                              )}
                            </button>
                            
                            <span className="w-12 text-center font-semibold text-gray-900">
                              {item.quantity || 1}
                            </span>
                            
                            <button
                              onClick={() => handleUpdateQuantity(itemId, (item.quantity || 1) + 1)}
                              disabled={isUpdating}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition duration-200"
                            >
                              {isUpdating ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <span className="text-gray-600">+</span>
                              )}
                            </button>
                          </div>

                          {/* Item Total & Remove */}
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900">
                              KES {itemTotal.toFixed(2)}
                            </p>
                            <button
                              onClick={() => handleRemoveItem(itemId)}
                              disabled={isUpdating}
                              className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 transition duration-200 mt-1"
                            >
                              {isUpdating ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>KES {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600 font-semibold">
                      {itemCount > 0 ? 'Calculated at checkout' : 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (0%)</span>
                    <span>KES 0.00</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg text-gray-900">
                      <span>Total</span>
                      <span>KES {total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Shipping will be calculated based on your address
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={updatingItems.size > 0 || itemCount === 0}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 mb-4 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-md flex items-center justify-center"
                >
                  {updatingItems.size > 0 ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    `Proceed to Checkout - KES ${total.toFixed(2)}`
                  )}
                </button>

                <Link 
                  to="/categories"
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 block text-center transition duration-200"
                >
                  Continue Shopping
                </Link>

                {/* Security Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center space-x-6 text-gray-500">
                    <div className="flex flex-col items-center space-y-1 text-xs">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        🔒
                      </div>
                      <span>Secure</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1 text-xs">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        💊
                      </div>
                      <span>Genuine</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1 text-xs">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        🚚
                      </div>
                      <span>Fast Delivery</span>
                    </div>
                  </div>
                </div>

                {/* Cart Debug Info (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300 text-xs text-gray-700">
                    <p><strong>Debug Info:</strong></p>
                    <p>• Items: {itemCount}</p>
                    <p>• Subtotal: KES {subtotal.toFixed(2)}</p>
                    <p>• Total: KES {total.toFixed(2)}</p>
                    <p>• Updating: {updatingItems.size} items</p>
                    <button 
                      onClick={fetchCart}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Refresh Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}