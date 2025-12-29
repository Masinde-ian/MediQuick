// components/ProductCard.jsx - UPDATED WITH WHATSAPP FOR PRESCRIPTION DRUGS
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Plus, Check, MessageCircle, Phone } from 'lucide-react';

// WhatsApp Configuration
const whatsappConfig = {
  pharmacy: {
    name: 'Pharmacy Team',
    phone: '+254712345678',
    hours: 'Mon-Sun: 8AM-8PM',
    role: 'For medication inquiries and orders'
  },
  doctor: {
    name: 'Dr. On Call',
    phone: '+254798765432',
    hours: '24/7 Emergency',
    role: 'For medical consultations and prescriptions'
  }
};

// Custom hook to get user info
const useUser = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUserFromToken = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')));
          
          return {
            id: payload.userId || payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.role || 'CUSTOMER',
            phone: payload.phone
          };
        }
      } catch (error) {
        console.log('Error parsing token:', error);
      }
      return null;
    };

    setUser(getUserFromToken());
    
    const handleStorageChange = () => {
      setUser(getUserFromToken());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return user;
};

// Custom hook for cart operations
const useCart = () => {
  const [cartState, setCartState] = useState({
    items: [],
    total: 0,
    itemCount: 0,
    loading: false
  });

  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('userCart');
        if (savedCart) {
          setCartState(JSON.parse(savedCart));
        }
      } catch (error) {
        console.log('Error loading cart from storage:', error);
      }
    };
    
    loadCart();
  }, []);

  useEffect(() => {
    if (cartState.items.length > 0) {
      localStorage.setItem('userCart', JSON.stringify(cartState));
    }
  }, [cartState]);

  const isInCart = (productId) => {
    return cartState.items.some(item => item.productId === productId);
  };

  const getItemQuantity = (productId) => {
    const item = cartState.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const addItemToCart = async (product, quantity = 1) => {
    try {
      setCartState(prev => ({ ...prev, loading: true }));
      
      console.log('🛒 Adding product to cart:', {
        productId: product.id,
        name: product.name,
        quantity
      });

      // Call backend API if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/api/cart/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              productId: product.id,
              quantity
            })
          });

          const data = await response.json();
          console.log('📦 Backend cart response:', data);

          if (data.success && data.data) {
            const cartData = data.data;
            setCartState({
              items: cartData.items || cartData.cart?.items || [],
              total: cartData.total || 0,
              itemCount: cartData.itemsCount || cartData.items?.length || 0,
              loading: false
            });
            return { success: true, data };
          }
        } catch (apiError) {
          console.log('📦 Using local cart due to API error:', apiError.message);
        }
      }

      // Local cart logic
      setCartState(prev => {
        const existingItemIndex = prev.items.findIndex(item => item.productId === product.id);
        
        let newItems;
        if (existingItemIndex >= 0) {
          newItems = [...prev.items];
          newItems[existingItemIndex] = {
            ...newItems[existingItemIndex],
            quantity: newItems[existingItemIndex].quantity + quantity
          };
        } else {
          const newItem = {
            id: `local-${Date.now()}`,
            productId: product.id,
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              salePrice: product.salePrice,
              images: product.images,
              brand: product.brand,
              prescriptionRequired: product.prescriptionRequired
            },
            quantity,
            itemTotal: (product.salePrice || product.price) * quantity
          };
          newItems = [...prev.items, newItem];
        }

        const newTotal = newItems.reduce((sum, item) => sum + item.itemTotal, 0);
        
        return {
          ...prev,
          items: newItems,
          total: newTotal,
          itemCount: newItems.reduce((count, item) => count + item.quantity, 0),
          loading: false
        };
      });

      return { success: true, message: 'Item added to cart' };
      
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      setCartState(prev => ({ ...prev, loading: false }));
      return { 
        success: false, 
        error: error.message || 'Failed to add to cart' 
      };
    }
  };

  const getItemCount = () => {
    return cartState.items.reduce((total, item) => total + item.quantity, 0);
  };

  return {
    cart: cartState,
    loading: cartState.loading,
    addItemToCart,
    isInCart,
    getItemQuantity,
    itemCount: getItemCount()
  };
};

// WhatsApp Modal Component
const WhatsAppModal = ({ product, onClose, onSelectContact }) => {
  const user = useUser();
  
  // Generate WhatsApp message
  const getWhatsAppMessage = (contactType = 'pharmacist') => {
    const baseMessage = `Hello${contactType === 'doctor' ? ' Doctor' : ''}! I'm interested in *${product.name}*.\n\n`;
    
    let specificMessage = '';
    if (contactType === 'pharmacist') {
      specificMessage = `Could you please help me with:\n` +
                       `1. Price and availability\n` +
                       `2. Delivery options\n` +
                       `3. Prescription requirements\n\n`;
    } else if (contactType === 'doctor') {
      specificMessage = `I'd like to consult about this medication:\n` +
                       `1. Is it suitable for my condition?\n` +
                       `2. Prescription requirements\n` +
                       `3. Dosage and precautions\n\n`;
    }
    
    const userInfo = user ? `My Name: ${user.name || 'Not provided'}\n` : '';
    
    return baseMessage + 
           specificMessage + 
           `Product: ${window.location.origin}/products/${product.slug}\n` +
           `SKU: ${product.sku}\n` +
           userInfo +
           `Thank you!`;
  };

  const handleWhatsAppClick = (contactType) => {
    const contact = whatsappConfig[contactType];
    const message = getWhatsAppMessage(contactType);
    const whatsappUrl = `https://wa.me/${contact.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onSelectContact && onSelectContact(contactType);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Consult About {product.name}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                This medication requires a prescription
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl p-1"
            >
              ×
            </button>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  This medication requires a valid prescription from a licensed doctor.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Options */}
          <div className="space-y-4">
            {/* Pharmacist Option */}
            <div 
              className="border-2 border-green-100 rounded-xl p-4 hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer"
              onClick={() => handleWhatsAppClick('pharmacy')}
            >
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.52 3.87A5 5 0 0015 2H9a5 5 0 00-4.52 2.87C2.25 8.1 2 12.05 2 12.05s.25 3.95 2.48 8.18A5 5 0 009 22h6a5 5 0 004.52-2.87c2.23-4.23 2.48-8.18 2.48-8.18s-.25-3.95-2.48-8.18zM9 4h6a3 3 0 012.71 1.74A19.24 19.24 0 0118 12.05a19.24 19.24 0 01-.29 6.21A3 3 0 0115 20H9a3 3 0 01-2.71-1.74A19.24 19.24 0 016 12.05a19.24 19.24 0 01.29-6.21A3 3 0 019 4zm3 14a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Talk to Pharmacist</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    For pricing, availability, and order details
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {whatsappConfig.pharmacy.hours}
                    </span>
                  </div>
                </div>
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>

            {/* Doctor Option */}
            <div 
              className="border-2 border-blue-100 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
              onClick={() => handleWhatsAppClick('doctor')}
            >
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7 7h10v2H7V7zm10 4H7v2h10v-2zm-2 4H7v2h8v-2z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Consult Doctor</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    For medical advice and prescription
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {whatsappConfig.doctor.hours}
                    </span>
                  </div>
                </div>
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Alternative Options */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">Other ways to get this medication:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  window.location.href = '/prescription-upload';
                  onClose();
                }}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                📄 Upload Prescription
              </button>
              <button
                onClick={() => {
                  window.location.href = '/pharmacy-locator';
                  onClose();
                }}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                🏥 Visit Pharmacy
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Secure & Confidential</span>
              <span className="mx-2">•</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
              <span>Verified Pharmacy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product, showAddToCart = true, showWishlist = true }) => {
  const {
    id,
    slug,
    name,
    price,
    salePrice,
    images,
    inStock,
    prescriptionRequired,
    brand,
    createdAt
  } = product;

  const user = useUser();
  const { cart, loading: cartLoading, addItemToCart, isInCart, getItemQuantity } = useCart();
  
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  
  const productInCart = isInCart(id);
  const cartQuantity = getItemQuantity(id);
  
  const getImageFilename = () => {
    try {
      if (!images) return null;
      
      if (typeof images === 'string') {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const imagePath = parsed[0];
          return imagePath.split('/').pop().replace(/['"]/g, '');
        }
      }
      
      if (Array.isArray(images) && images.length > 0) {
        const imagePath = images[0];
        return typeof imagePath === 'string' 
          ? imagePath.split('/').pop().replace(/['"]/g, '')
          : null;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing image filename:', error);
      return null;
    }
  };

  const imageFilename = getImageFilename();
  const imageUrl = imageFilename ? `/products/${imageFilename}` : '/placeholder-product.jpg';
  
  const isOnSale = salePrice && salePrice < price;
  const discountPercentage = isOnSale 
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const isNew = createdAt ? 
    (new Date() - new Date(createdAt)) < (7 * 24 * 60 * 60 * 1000) : 
    false;

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return 'KSh 0';
    return `KSh ${amount?.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  // Handle Add to Cart for non-prescription drugs
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (prescriptionRequired) {
      setShowWhatsAppModal(true);
      return;
    }
    
    console.log('🛒 Add to cart clicked for product:', {
      id,
      name,
      inStock,
      userLoggedIn: !!user
    });
    
    if (!inStock) {
      showNotification('error', 'Out of Stock', `${name} is currently out of stock`);
      return;
    }
    
    if (!user) {
      showNotification('info', 'Login Required', 'Please login to add items to cart');
      return;
    }
    
    setIsAddingToCart(true);
    try {
      const result = await addItemToCart(product, 1);
      
      if (result.success) {
        setShowAddedAnimation(true);
        setTimeout(() => setShowAddedAnimation(false), 2000);
        
        showNotification('success', 'Added to Cart!', `${name} has been added to your cart`);
        
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { productId: id, productName: name }
        }));
        
      } else {
        showNotification('error', 'Unable to Add', result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      showNotification('error', 'Error', 'An unexpected error occurred');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle WhatsApp click for prescription drugs
  const handleWhatsAppClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowWhatsAppModal(true);
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      showNotification('info', 'Login Required', 'Please login to manage wishlist');
      return;
    }
    
    const newWishlistState = !isWishlisted;
    setIsWishlisted(newWishlistState);
    
    showNotification(
      newWishlistState ? 'success' : 'info',
      newWishlistState ? 'Added to Wishlist' : 'Removed from Wishlist',
      newWishlistState 
        ? `${name} has been added to your wishlist`
        : `${name} has been removed from your wishlist`
    );
  };

  // Helper to show notifications
  const showNotification = (type, title, message) => {
    const event = new CustomEvent('showNotification', {
      detail: { type, title, message, duration: 3000 }
    });
    window.dispatchEvent(event);
  };

  // Get button text based on prescription requirement
  const getActionButtonText = () => {
    if (prescriptionRequired) {
      return 'Consult via WhatsApp';
    }
    
    if (productInCart) return `In Cart (${cartQuantity})`;
    if (isAddingToCart || cartLoading) return 'Adding...';
    if (!inStock) return 'Out of Stock';
    if (!user) return 'Login to Add';
    return 'Add to Cart';
  };

  // Get button title/tooltip
  const getButtonTitle = () => {
    if (prescriptionRequired) return 'Consult pharmacist or doctor for prescription';
    if (!inStock) return 'Out of stock';
    if (!user) return 'Please login to add to cart';
    if (productInCart) return `${cartQuantity} in cart - Click to add more`;
    return `Add ${name} to cart`;
  };

  // Get button styles based on prescription requirement
  const getButtonStyles = () => {
    if (prescriptionRequired) {
      return 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700';
    }
    
    if (productInCart) {
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    }
    
    if (inStock && user) {
      return 'bg-blue-600 text-white hover:bg-blue-700';
    }
    
    return 'bg-gray-200 text-gray-400';
  };

  return (
    <>
      <Link 
        to={`/products/${slug}`}
        className="block bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] active:shadow-inner transition-all duration-200 hover:shadow-md relative group"
      >
        {/* Success Animation */}
        {showAddedAnimation && (
          <div className="absolute inset-0 bg-green-500/10 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
            <div className="bg-white rounded-full p-3 shadow-lg animate-bounce">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        )}
        
        <div className="relative">
          {/* Product Image */}
          <div className="relative h-48 bg-gray-50 rounded-t-2xl overflow-hidden">
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageError(true)}
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {prescriptionRequired && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  RX Required
                </span>
              )}
              {isOnSale && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                  -{discountPercentage}%
                </span>
              )}
              {isNew && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                  NEW
                </span>
              )}
              {!inStock && (
                <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                  Out of Stock
                </span>
              )}
            </div>
            
            {/* Wishlist button */}
            {showWishlist && (
              <button
                onClick={handleWishlistToggle}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:bg-white transition-all z-10"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                type="button"
              >
                <Heart 
                  size={16} 
                  className={isWishlisted ? "text-red-500 fill-red-500" : "text-gray-600"}
                />
              </button>
            )}
          </div>
          
          {/* Product Info */}
          <div className="p-4">
            {/* Brand */}
            {brand && (
              <div className="mb-1">
                <span className="text-xs text-gray-500 font-medium truncate block">
                  {brand.name}
                </span>
              </div>
            )}
            
            {/* Product Name */}
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm min-h-[40px]">
              {name}
            </h3>
            
            {/* Prescription Notice */}
            {prescriptionRequired && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Requires doctor's prescription
                </p>
              </div>
            )}
            
            {/* Price and Actions */}
            <div className="flex items-center justify-between">
              {/* Price */}
              <div>
                {prescriptionRequired ? (
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">Consult for price</span>
                    <span className="text-xs text-gray-500">Available on prescription</span>
                  </div>
                ) : isOnSale ? (
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(salePrice)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(price)}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(price)}
                  </span>
                )}
              </div>
              
              {/* Action Button */}
              {showAddToCart && (
                <button
                  onClick={prescriptionRequired ? handleWhatsAppClick : handleAddToCart}
                  disabled={(!inStock && !prescriptionRequired) || isAddingToCart || cartLoading || (!user && !prescriptionRequired)}
                  className={`min-w-[100px] px-3 py-2 rounded-full flex items-center justify-center transition-all text-sm font-medium ${getButtonStyles()} shadow-sm hover:shadow active:scale-95`}
                  aria-label={getButtonTitle()}
                  type="button"
                  title={getButtonTitle()}
                >
                  {isAddingToCart || cartLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : prescriptionRequired ? (
                    <div className="flex items-center gap-2">
                      <MessageCircle size={14} />
                      <span>Consult</span>
                    </div>
                  ) : productInCart ? (
                    <div className="flex items-center gap-1">
                      <Check size={14} />
                      <span>{cartQuantity}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {!prescriptionRequired && <Plus size={14} />}
                      <span>{getActionButtonText()}</span>
                    </div>
                  )}
                </button>
              )}
            </div>
            
            {/* Stock Status */}
            <div className="mt-2">
              {!inStock && !prescriptionRequired && (
                <span className="text-xs text-red-500 font-medium">
                  Out of Stock
                </span>
              )}
              {showAddToCart && !user && inStock && !prescriptionRequired && (
                <span className="text-xs text-gray-500">
                  Login to add to cart
                </span>
              )}
              {prescriptionRequired && (
                <span className="text-xs text-gray-500">
                  Message pharmacist for details
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          product={product}
          onClose={() => setShowWhatsAppModal(false)}
          onSelectContact={(type) => {
            console.log(`Selected ${type} for product:`, product.name);
            showNotification(
              'success', 
              'WhatsApp Opened', 
              `Messaging ${type === 'pharmacy' ? 'pharmacist' : 'doctor'} about ${product.name}`
            );
          }}
        />
      )}
    </>
  );
};

// Skeleton Loader
export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 animate-pulse">
    <div className="h-48 bg-gray-200 rounded-t-2xl" />
    <div className="p-4">
      <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="w-20 h-8 bg-gray-200 rounded-full" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mt-3" />
    </div>
  </div>
);

// Grid wrapper
export const ProductGrid = ({ children, columns = 2, className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns] || 'grid-cols-2'} gap-4 ${className}`}>
      {children}
    </div>
  );
};

// Simple Notification Component
export const Notification = () => {
  const [notification, setNotification] = useState(null);
  
  useEffect(() => {
    const handleShowNotification = (e) => {
      setNotification(e.detail);
      setTimeout(() => setNotification(null), e.detail.duration || 3000);
    };
    
    window.addEventListener('showNotification', handleShowNotification);
    return () => window.removeEventListener('showNotification', handleShowNotification);
  }, []);
  
  if (!notification) return null;
  
  const bgColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm ${bgColors[notification.type] || 'bg-gray-50'} animate-slide-in`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{icons[notification.type] || '💡'}</span>
        <div className="flex-1">
          <div className="font-semibold mb-1">{notification.title}</div>
          <div className="text-sm">{notification.message}</div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ProductCard;