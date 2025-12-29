// contexts/CartContext.jsx - COMPLETE UPDATED VERSION
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext({});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({
    items: [],
    total: 0,
    subtotal: 0,
    itemCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🛒 Cart Context - User not authenticated, clearing cart');
      setCart({ items: [], total: 0, subtotal: 0, itemCount: 0 });
      return;
    }

    try {
      setCartLoading(true);
      console.log('🛒 Cart Context - Fetching cart...');
      const response = await cartAPI.get();
      
      console.log('🛒 Cart Context - API Response:', {
        status: response.status,
        data: response.data,
        success: response.data?.success,
        hasData: !!response.data?.data
      });
      
      let items = [];
      let total = 0;
      let subtotal = 0;
      
      // Debug: Log the full response structure
      console.log('🔍 Full response structure:', JSON.stringify(response.data, null, 2));
      
      // Most common structure: { success: true, data: { items: [], total: 0, ... } }
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        
        // Case 1: data has items array directly
        if (Array.isArray(data.items)) {
          console.log('📦 Structure: data.items (array)');
          items = data.items;
          total = data.total || 0;
          subtotal = data.subtotal || total || 0;
        }
        // Case 2: data has cart object with items
        else if (data.cart && Array.isArray(data.cart.items)) {
          console.log('📦 Structure: data.cart.items');
          items = data.cart.items;
          total = data.total || data.cart.total || 0;
          subtotal = data.subtotal || data.cart.subtotal || total || 0;
        }
        // Case 3: data is the items array
        else if (Array.isArray(data)) {
          console.log('📦 Structure: data (array)');
          items = data;
          // Calculate totals
          items.forEach(item => {
            const price = item.product?.price || item.price || 0;
            const quantity = item.quantity || 1;
            total += price * quantity;
          });
          subtotal = total;
        }
        // Case 4: data has nested structure
        else if (data.data && Array.isArray(data.data.items)) {
          console.log('📦 Structure: data.data.items');
          items = data.data.items;
          total = data.data.total || 0;
          subtotal = data.data.subtotal || total || 0;
        }
      } 
      // Alternative structure: { items: [], total: 0, ... } directly in response.data
      else if (Array.isArray(response.data?.items)) {
        console.log('📦 Structure: response.data.items');
        items = response.data.items;
        total = response.data.total || 0;
        subtotal = response.data.subtotal || total || 0;
      }
      // Response is an array (direct items)
      else if (Array.isArray(response.data)) {
        console.log('📦 Structure: response.data (array)');
        items = response.data;
        items.forEach(item => {
          const price = item.product?.price || item.price || 0;
          const quantity = item.quantity || 1;
          total += price * quantity;
        });
        subtotal = total;
      }
      else {
        console.warn('⚠️ Unknown cart response structure, using fallback');
        items = [];
      }
      
      console.log('📊 Cart Summary:', {
        itemCount: items.length,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name,
          quantity: item.quantity,
          price: item.product?.price || item.price
        })),
        total,
        subtotal
      });
      
      const cartData = {
        items: items || [],
        total: Number(total) || 0,
        subtotal: Number(subtotal) || 0,
        itemCount: items.length || 0
      };
      
      console.log('✅ Cart Context - Updated cart state:', cartData);
      setCart(cartData);
    } catch (error) {
      console.error('❌ Cart Context - Failed to fetch cart:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setCart({ items: [], total: 0, subtotal: 0, itemCount: 0 });
    } finally {
      setCartLoading(false);
    }
  }, [isAuthenticated]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      console.log(`➕ Adding product ${productId} to cart, quantity: ${quantity}`);
      
      const result = await cartAPI.addItem({ productId, quantity });
      console.log('➕ Add to cart API response:', result);
      
      if (result.data?.success) {
        console.log('✅ Item added successfully, refreshing cart...');
        await fetchCart();
        
        // Return success with detailed data
        return { 
          success: true, 
          data: result.data,
          message: result.data.message || 'Item added to cart'
        };
      } else {
        console.warn('⚠️ API returned success: false', result.data);
        return { 
          success: false, 
          error: result.data?.message || 'Failed to add to cart',
          data: result.data 
        };
      }
    } catch (error) {
      console.error('❌ Failed to add to cart:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to add to cart',
        data: error.response?.data 
      };
    } finally {
      setLoading(false);
    }
  };

  // New function that accepts both product object and productId
  const addItemToCart = async (productOrId, quantity = 1) => {
    // Handle both product object and productId string
    const productId = typeof productOrId === 'object' ? productOrId.id : productOrId;
    const productName = typeof productOrId === 'object' ? productOrId.name : '';
    
    console.log(`🛒 addItemToCart called:`, {
      productId,
      productName,
      quantity,
      inputType: typeof productOrId
    });
    
    if (!productId) {
      console.error('❌ No product ID provided');
      return { 
        success: false, 
        error: 'No product ID provided' 
      };
    }
    
    if (!isAuthenticated) {
      console.error('❌ User not authenticated');
      return { 
        success: false, 
        error: 'Please login to add items to cart',
        requiresLogin: true 
      };
    }
    
    const result = await addToCart(productId, quantity);
    
    if (result.success) {
      // Show success feedback
      console.log(`✅ Successfully added ${productName || 'item'} to cart`);
      
      // Dispatch custom event for UI updates
      const event = new CustomEvent('cartItemAdded', {
        detail: {
          productId,
          productName,
          quantity,
          cart: result.data?.data
        }
      });
      window.dispatchEvent(event);
      
      // Also dispatch a simpler event for general UI updates
      const updateEvent = new CustomEvent('cartUpdate', {
        detail: {
          action: 'add',
          productName,
          quantity
        }
      });
      window.dispatchEvent(updateEvent);
    } else {
      console.error('❌ Failed to add item:', result.error);
    }
    
    return result;
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      setLoading(true);
      console.log(`🔄 Updating item ${itemId} to quantity ${quantity}`);
      
      const result = await cartAPI.updateItem({ itemId, quantity });
      console.log('🔄 Update quantity result:', result);
      
      if (result.data?.success) {
        await fetchCart();
        return { 
          success: true, 
          data: result.data,
          message: result.data.message || 'Cart updated'
        };
      } else {
        return { 
          success: false, 
          error: result.data?.message || 'Failed to update quantity',
          data: result.data 
        };
      }
    } catch (error) {
      console.error('❌ Failed to update quantity:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message
      };
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId) => {
    try {
      setLoading(true);
      console.log(`🗑️ Removing item ${itemId}`);
      
      const result = await cartAPI.removeItem(itemId);
      console.log('🗑️ Remove item result:', result);
      
      if (result.data?.success) {
        await fetchCart();
        return { 
          success: true, 
          data: result.data,
          message: result.data.message || 'Item removed from cart'
        };
      } else {
        return { 
          success: false, 
          error: result.data?.message || 'Failed to remove item',
          data: result.data 
        };
      }
    } catch (error) {
      console.error('❌ Failed to remove item:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message
      };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      console.log('🧹 Clearing cart');
      
      const result = await cartAPI.clear();
      console.log('🧹 Clear cart result:', result);
      
      if (result.data?.success) {
        setCart({ items: [], total: 0, subtotal: 0, itemCount: 0 });
        return { 
          success: true, 
          data: result.data,
          message: result.data.message || 'Cart cleared'
        };
      } else {
        return { 
          success: false, 
          error: result.data?.message || 'Failed to clear cart',
          data: result.data 
        };
      }
    } catch (error) {
      console.error('❌ Failed to clear cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Calculate item count (sum of quantities)
  const calculateItemCount = () => {
    const count = cart.items.reduce((total, item) => total + (item.quantity || 1), 0);
    return count;
  };

  // Check if product is already in cart
  const isInCart = (productId) => {
    return cart.items.some(item => item.productId === productId);
  };

  // Get item quantity in cart
  const getItemQuantity = (productId) => {
    const item = cart.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  // Fetch cart when authentication changes
  useEffect(() => {
    console.log('🔄 Cart Context - Auth changed, isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      fetchCart();
    } else {
      console.log('🚪 User logged out, clearing cart');
      setCart({ items: [], total: 0, subtotal: 0, itemCount: 0 });
    }
  }, [isAuthenticated, fetchCart]);

  // Refresh cart every 60 seconds to keep it updated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing cart...');
      fetchCart();
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchCart]);

  const value = {
    cart,
    loading: loading || cartLoading,
    cartLoading,
    fetchCart,
    addToCart,           // Original - expects productId
    addItemToCart,       // New - accepts both product object or productId
    updateQuantity,
    removeItem,
    clearCart,
    isInCart,
    getItemQuantity,
    itemCount: calculateItemCount(),
    formattedTotal: `KSh ${cart.total.toLocaleString('en-KE')}`
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Debug component for testing
export const CartDebug = () => {
  const cart = useCart();
  
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-xs">
      <h3 className="font-bold mb-2 text-sm">🛒 Cart Debug</h3>
      <div className="text-xs space-y-1">
        <div>Items: {cart.itemCount}</div>
        <div>Total: {cart.formattedTotal}</div>
        <div>Loading: {cart.loading ? 'Yes' : 'No'}</div>
        <div>Cart Items: {cart.cart.items.length}</div>
        <button 
          onClick={() => cart.fetchCart()}
          className="mt-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
        >
          Refresh Cart
        </button>
      </div>
    </div>
  );
};

// Test component for adding items
export const CartTestButton = ({ productId, productName = 'Test Product' }) => {
  const { addItemToCart, loading } = useCart();
  
  const handleTestAdd = async () => {
    if (!productId) {
      alert('No product ID provided');
      return;
    }
    
    console.log('🧪 Testing add to cart with:', { productId, productName });
    
    const result = await addItemToCart(productId, 1);
    
    if (result.success) {
      alert(`✅ Added ${productName} to cart!`);
    } else {
      alert(`❌ Failed: ${result.error}`);
    }
  };
  
  return (
    <button
      onClick={handleTestAdd}
      disabled={loading}
      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? 'Adding...' : 'Test Add'}
    </button>
  );
};