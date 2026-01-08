import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Heart, Plus, Check } from 'lucide-react';

/* =====================================================
   PRODUCT CARD
===================================================== */
const ProductCard = ({ product, showAddToCart = true, showWishlist = true }) => {
  if (!product) return null;

  const {
    name,
    price,
    salePrice,
    images,
    inStock,
    brand,
    createdAt
  } = product;

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  /* ===========================
     IMAGE HANDLER (BACKEND SERVING)
  =========================== */
  const getImageUrl = useCallback(() => {
    if (!images) return null;
    
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    let imagePath = '';
    
    // Parse images based on type
    if (typeof images === 'string') {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imagePath = parsed[0];
        }
      } catch (e) {
        // If not JSON, use as single string
        imagePath = images;
      }
    } else if (Array.isArray(images)) {
      if (images.length > 0) {
        imagePath = images[0];
      }
    }
    
    if (!imagePath) return null;
    
    // Clean the path (remove quotes)
    imagePath = imagePath.toString().trim().replace(/^['"]+|['"]+$/g, '');
    
    // Construct URL
    if (imagePath.startsWith('http')) {
      return imagePath; // Already full URL
    } else if (imagePath.startsWith('/uploads/')) {
      return `${API_BASE_URL}${imagePath}`; // Add backend URL
    } else if (imagePath.includes('uploads/')) {
      return `${API_BASE_URL}/${imagePath}`; // Add backend URL and slash
    } else {
      return `${API_BASE_URL}/uploads/products/${imagePath}`; // Just filename
    }
  }, [images]);

  const imageUrl = useMemo(() => getImageUrl(), [getImageUrl]);

  // Reset image states when URL changes
  useEffect(() => {
    if (imageUrl) {
      setImgError(false);
      setImgLoading(true);
    }
  }, [imageUrl]);

  /* ===========================
     IMAGE EVENT HANDLERS
  =========================== */
  const handleImageLoad = () => {
    setImgLoading(false);
    console.log('✅ Image loaded:', imageUrl);
  };

  const handleImageError = (e) => {
    console.error('❌ Image failed:', {
      url: imageUrl,
      product: name,
      error: e
    });
    setImgError(true);
    setImgLoading(false);
  };

  /* ===========================
     DERIVED STATES
  =========================== */
  const isOnSale = typeof salePrice === 'number' && salePrice < price;

  const discountPercentage = isOnSale
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const isNew = useMemo(() => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  }, [createdAt]);

  const formatPrice = (value) =>
    typeof value === 'number'
      ? `KSh ${value.toLocaleString('en-KE')}`
      : 'KSh 0';

  /* ===========================
     NOTIFICATIONS
  =========================== */
  const showNotification = (type, title, message) => {
    window.dispatchEvent(
      new CustomEvent('showNotification', {
        detail: { type, title, message, duration: 3000 }
      })
    );
  };

  /* ===========================
     ACTIONS
  =========================== */
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock) {
      showNotification('error', 'Out of Stock', `${name} is out of stock`);
      return;
    }

    setIsAddingToCart(true);

    setTimeout(() => {
      setIsAddingToCart(false);
      setShowAddedAnimation(true);
      showNotification('success', 'Added to Cart', `${name} added to cart`);

      setTimeout(() => setShowAddedAnimation(false), 1800);
    }, 300);
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted((prev) => !prev);
  };

  /* ===========================
     RENDER
  =========================== */
  return (
    <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group">
      {/* ADDED TO CART OVERLAY */}
      {showAddedAnimation && (
        <div className="absolute inset-0 z-20 bg-green-500/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="bg-white p-3 rounded-full shadow animate-bounce">
            <Check className="w-6 h-6 text-green-600" />
          </div>
        </div>
      )}

      {/* IMAGE */}
      <div className="block">
        <div className="relative h-40 bg-gray-50 rounded-t-xl overflow-hidden">
          {/* LOADING STATE */}
          {imgLoading && imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* IMAGE OR PLACEHOLDER */}
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                imgLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-sm bg-gray-100">
              <div className="mb-2">📷</div>
              <div>No Image</div>
            </div>
          )}

          {/* BADGES */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOnSale && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                -{discountPercentage}%
              </span>
            )}
            {isNew && (
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                NEW
              </span>
            )}
            {!inStock && (
              <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Out of Stock
              </span>
            )}
          </div>

          {/* WISHLIST */}
          {showWishlist && (
            <button
              onClick={handleWishlistToggle}
              type="button"
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center z-10 hover:bg-gray-50 transition"
            >
              <Heart
                size={16}
                className={
                  isWishlisted
                    ? 'text-red-500 fill-red-500'
                    : 'text-gray-600'
                }
              />
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-3">
        {brand?.name && (
          <span className="block text-xs text-gray-500 mb-1 truncate">
            {brand.name}
          </span>
        )}

        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[40px]">
          {name}
        </h3>

        {/* PRICE SECTION - Responsive layout */}
        <div className="mt-2">
          {/* Price displayed above on small screens */}
          <div className="sm:hidden mb-2">
            {isOnSale ? (
              <>
                <div className="font-bold text-gray-900">
                  {formatPrice(salePrice)}
                </div>
                <div className="text-sm text-gray-400 line-through">
                  {formatPrice(price)}
                </div>
              </>
            ) : (
              <div className="font-bold text-gray-900">
                {formatPrice(price)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            {/* Price hidden on small screens (shown above) */}
            <div className="hidden sm:block">
              {isOnSale ? (
                <>
                  <div className="font-bold text-gray-900">
                    {formatPrice(salePrice)}
                  </div>
                  <div className="text-sm text-gray-400 line-through">
                    {formatPrice(price)}
                  </div>
                </>
              ) : (
                <div className="font-bold text-gray-900">
                  {formatPrice(price)}
                </div>
              )}
            </div>

            {/* ADD TO CART BUTTON */}
            {showAddToCart && (
              <button
                onClick={handleAddToCart}
                disabled={!inStock || isAddingToCart}
                className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 transition min-w-[100px] justify-center w-full sm:w-auto
                  ${
                    inStock
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isAddingToCart ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {inStock && <Plus size={12} />}
                    {inStock ? 'Add to Cart' : 'Out of Stock'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   SKELETON
===================================================== */
export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 animate-pulse">
    <div className="h-40 bg-gray-200 rounded-t-xl" />
    <div className="p-3">
      <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="w-20 h-8 bg-gray-200 rounded-full" />
      </div>
    </div>
  </div>
);

/* =====================================================
   GRID
===================================================== */
export const ProductGrid = ({ children, columns = 2, className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };

  return (
    <div className={`grid ${gridCols[columns] || 'grid-cols-2'} gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default ProductCard;