import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { categoryAPI, productAPI, conditionAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { Truck, Shield, Clock, AlertCircle, Heart, ChevronDown, Database } from 'lucide-react';

const Homepage = () => {
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    categories: true,
    conditions: true,
    products: true,
    loadingMore: false
  });
  const [errors, setErrors] = useState({
    categories: null,
    conditions: null,
    products: null
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 20;

  useEffect(() => {
    fetchCategories();
    fetchConditions();
    fetchProducts(1); // Load first page immediately
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(prev => ({ ...prev, categories: true }));
      setErrors(prev => ({ ...prev, categories: null }));
      
      const response = await categoryAPI.getAll();
      
      let categoriesData = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (response.data.success && response.data.data?.categories) {
          categoriesData = response.data.data.categories;
        } else if (Array.isArray(response.data.categories)) {
          categoriesData = response.data.categories;
        } else if (Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        }
      }
      
      if (!Array.isArray(categoriesData)) {
        setCategories([]);
        return;
      }
      
      const topCategories = categoriesData
        .filter(cat => {
          const level = cat.level || cat.level === 0 ? cat.level : 0;
          const isLeaf = cat.isLeaf !== undefined ? cat.isLeaf : true;
          return (level === 0 || level === 1) && isLeaf;
        })
        .slice(0, 6);
      
      setCategories(topCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setErrors(prev => ({ 
        ...prev, 
        categories: error.code === 'ERR_NETWORK' 
          ? 'Unable to connect to server. Please check your connection.'
          : 'Failed to load categories. Please try again later.'
      }));
      setCategories([]);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const fetchConditions = async () => {
    try {
      setLoading(prev => ({ ...prev, conditions: true }));
      setErrors(prev => ({ ...prev, conditions: null }));
      
      const response = await conditionAPI.getAll();
      
      let conditionsData = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          conditionsData = response.data.data;
        } else if (response.data.success && response.data.data?.conditions) {
          conditionsData = response.data.data.conditions;
        } else if (Array.isArray(response.data.conditions)) {
          conditionsData = response.data.conditions;
        } else if (Array.isArray(response.data)) {
          conditionsData = response.data;
        } else if (Array.isArray(response.data.data)) {
          conditionsData = response.data.data;
        }
      }
      
      if (!Array.isArray(conditionsData)) {
        setConditions([]);
        return;
      }
      
      setConditions(conditionsData.slice(0, 8));
    } catch (error) {
      console.error('Error fetching conditions:', error);
      setErrors(prev => ({ 
        ...prev, 
        conditions: error.code === 'ERR_NETWORK' 
          ? 'Unable to connect to server. Please check your connection.'
          : 'Failed to load conditions. Please try again later.'
      }));
      setConditions([]);
    } finally {
      setLoading(prev => ({ ...prev, conditions: false }));
    }
  };

  const fetchProducts = async (pageNumber = 1, loadMore = false) => {
    try {
      if (loadMore) {
        setLoading(prev => ({ ...prev, loadingMore: true }));
      } else {
        setLoading(prev => ({ ...prev, products: true }));
      }
      
      setErrors(prev => ({ ...prev, products: null }));
      
      const response = await productAPI.getAll({ 
        page: pageNumber, 
        limit: productsPerPage,
        // featured: true 
      });
      
      let productsData = [];
      let responseTotal = 0;
      
      // Parse the response based on different structures
      if (response.data) {
        // Structure 1: { success: true, data: { products: [...], total: X } }
        if (response.data.success && response.data.data?.products) {
          productsData = response.data.data.products;
          responseTotal = response.data.data.total || response.data.data.count || 0;
        }
        // Structure 2: { success: true, data: [...], total: X }
        else if (response.data.success && Array.isArray(response.data.data)) {
          productsData = response.data.data;
          responseTotal = response.data.total || response.data.data.length || 0;
        }
        // Structure 3: { products: [...], total: X }
        else if (response.data.products && Array.isArray(response.data.products)) {
          productsData = response.data.products;
          responseTotal = response.data.total || response.data.count || 0;
        }
        // Structure 4: Direct array
        else if (Array.isArray(response.data)) {
          productsData = response.data;
          responseTotal = response.data.length;
        }
      }
      
      if (Array.isArray(productsData)) {
        if (loadMore) {
          // Append new products to existing ones
          setProducts(prev => [...prev, ...productsData]);
        } else {
          // Set initial products
          setProducts(productsData);
        }
        
        // Update total if available
        if (responseTotal > 0) {
          setTotalProducts(responseTotal);
        }
        
        // Determine if there are more products to load
        if (productsData.length < productsPerPage) {
          setHasMore(false); // Last page reached
        } else {
          setHasMore(true);
        }
        
        // Update page state
        setPage(pageNumber);
      }
    } catch (error) {
      console.error(`Error fetching products page ${pageNumber}:`, error);
      setErrors(prev => ({ 
        ...prev, 
        products: error.code === 'ERR_NETWORK' 
          ? 'Unable to connect to server. Please check your connection.'
          : 'Failed to load products. Please try again later.'
      }));
    } finally {
      if (loadMore) {
        setLoading(prev => ({ ...prev, loadingMore: false }));
      } else {
        setLoading(prev => ({ ...prev, products: false }));
      }
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    fetchProducts(nextPage, true);
  };

  // Loading skeleton components
  const CategorySkeleton = () => (
    <div className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
      <div className="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
    </div>
  );

  const WellnessSkeleton = () => (
    <div className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );

  // Error display component
  const ErrorMessage = ({ message, onRetry, icon: Icon = AlertCircle }) => (
    <div className="text-center py-6 px-4 bg-gray-50 rounded-2xl">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-gray-600 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition active:scale-95"
        >
          Try Again
        </button>
      )}
    </div>
  );

  // Get category icon based on name
  const getCategoryIcon = (name) => {
    const iconMap = {
      'skincare': '✨',
      'makeup': '💄',
      'haircare': '💇',
      'fitness': '💪',
      'nutrition': '🥗',
      'vitamins': '💊',
      'wellness': '🌸',
      'supplements': '💊',
      'bodycare': '🛁',
      'fragrance': '🌸',
      'tools': '🔧',
      'accessories': '💎'
    };

    if (!name) return '✨';
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    return '✨';
  };

  // Safely get product count
  const getProductCount = (item) => {
    if (!item) return 0;
    return item.productCount || item._count?.products || item.products?.length || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Beauty & Wellness Redefined
            </h1>
            <p className="text-base md:text-xl mb-8 opacity-90">
              Discover premium beauty products, fitness essentials, and health supplements for your best self
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                to="/categories" 
                className="bg-white text-blue-600 px-6 py-3 md:px-8 md:py-4 rounded-full font-semibold text-center hover:bg-gray-100 transition duration-300 active:scale-95 shadow-lg"
              >
                Shop Now
              </Link>
              <Link 
                to="/new-arrivals" 
                className="bg-transparent text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-semibold text-center hover:bg-white/10 transition duration-300 active:scale-95 border border-white"
              >
                New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">5000+</div>
              <div className="text-sm text-gray-600">Premium Products</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">24/7</div>
              <div className="text-sm text-gray-600">Expert Support</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600">Authentic Brands</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">Free</div>
              <div className="text-sm text-gray-600">Shipping Over $50</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop by Category</h2>
              <p className="text-gray-600">Browse our curated collections</p>
            </div>
            <Link 
              to="/categories" 
              className="text-blue-600 font-medium hover:text-blue-700 whitespace-nowrap"
            >
              View all →
            </Link>
          </div>
          
          {errors.categories ? (
            <ErrorMessage 
              message={errors.categories} 
              onRetry={fetchCategories}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {loading.categories
                ? Array.from({ length: 6 }).map((_, index) => (
                    <CategorySkeleton key={index} />
                  ))
                : categories.length > 0 ? (
                  categories.map((category) => (
                    <Link
                      key={category.id || category._id || Math.random()}
                      to={`/categories/${category.slug}`}
                      className="bg-white rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300 active:scale-95 border border-gray-100"
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                        <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                        {category.name || 'Category'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {getProductCount(category)} products
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No categories available
                  </div>
                )
              }
            </div>
          )}
        </div>
      </section>

      {/* Wellness Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Wellness Solutions</h2>
              <p className="text-gray-600">Products for your health and wellness goals</p>
            </div>
            <Link 
              to="/wellness" 
              className="text-blue-600 font-medium hover:text-blue-700 whitespace-nowrap"
            >
              View all →
            </Link>
          </div>
          
          {errors.conditions ? (
            <ErrorMessage 
              message={errors.conditions} 
              onRetry={fetchConditions}
              icon={Heart}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {loading.conditions
                ? Array.from({ length: 8 }).map((_, index) => (
                    <WellnessSkeleton key={index} />
                  ))
                : conditions.length > 0 ? (
                  conditions.map((condition) => (
                    <Link
                      key={condition.id || condition._id || Math.random()}
                      to={`/wellness/${condition.slug}`}
                      className="bg-white rounded-2xl p-4 hover:shadow-md transition-all duration-300 active:scale-[0.98] active:shadow-inner border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Heart size={20} className="text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                            {condition.name || 'Wellness'}
                          </h3>
                          <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                            {condition.description || `Products for ${condition.name || 'your wellness goals'}`}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600 text-xs font-medium">
                              {getProductCount(condition)} products
                            </span>
                            <span className="text-blue-600 text-xs">→</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No wellness categories available
                  </div>
                )
              }
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Products</h2>
              <p className="text-gray-600">Browse our complete product collection</p>
            </div>
            <Link 
              to="/products" 
              className="text-blue-600 font-medium hover:text-blue-700 whitespace-nowrap"
            >
              Advanced Search →
            </Link>
          </div>
          
          {errors.products ? (
            <ErrorMessage 
              message={errors.products} 
              onRetry={() => fetchProducts(1)}
              icon={AlertCircle}
            />
          ) : loading.products && products.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
              {[...Array(productsPerPage)].map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Products Grid - 5 per row on large screens */}
              <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
                {products.map((product) => (
                  <ProductCard
                    key={`${product.id || product._id || Math.random()}-${Math.random().toString(36).substr(2, 9)}`}
                    product={product}
                    showAddToCart={true}
                    showWishlist={true}
                  />
                ))}
                
                {/* Show skeletons while loading more */}
                {loading.loadingMore && 
                  [...Array(productsPerPage)].map((_, index) => (
                    <ProductCardSkeleton key={`skeleton-${index}`} />
                  ))
                }
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading.loadingMore}
                    className="bg-blue-600 text-white px-8 py-4 rounded-full font-medium hover:bg-blue-700 transition flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 min-w-[200px]"
                  >
                    {loading.loadingMore ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Loading More...
                      </>
                    ) : (
                      <>
                        Load More Products
                        <ChevronDown size={20} />
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Product Stats */}
              <div className="mt-8 text-center">
                <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Database className="text-blue-600" size={20} />
                    <span className="text-sm text-gray-600">Showing</span>
                    <span className="font-bold text-blue-600">{products.length}</span>
                    <span className="text-sm text-gray-600">products</span>
                  </div>
                  
                  {totalProducts > 0 && (
                    <>
                      <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Total in database:</span>
                        <span className="font-bold text-green-600">{totalProducts}</span>
                      </div>
                    </>
                  )}
                  
                  {!hasMore && products.length > 0 && (
                    <>
                      <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm">All products loaded</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Available</h3>
              <p className="text-gray-600 mb-4">Check back later for our products</p>
              <button
                onClick={() => fetchProducts(1)}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition"
              >
                Try Loading Again
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 md:mb-12">Why Shop With Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-3">Fast & Free Shipping</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Free delivery on orders over $50. Same-day delivery available in select areas.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-3">100% Authentic</h3>
              <p className="text-gray-600 text-sm md:text-base">
                All products are sourced directly from authorized distributors and verified brands.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-3">Expert Advice</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Our beauty and wellness experts are available to help you make the right choices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Glow?</h2>
          <p className="text-base md:text-lg mb-6 md:mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust us for their beauty, fitness, and wellness needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/new-customer-offer" 
              className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold inline-block hover:bg-gray-100 transition duration-300 active:scale-95 shadow-lg"
            >
              Get 20% Off First Order
            </Link>
            <Link 
              to="/blog" 
              className="bg-transparent text-white px-6 py-3 rounded-full font-semibold inline-block hover:bg-white/10 transition duration-300 active:scale-95 border border-white"
            >
              Read Our Blog
            </Link>
          </div>
        </div>
      </section>

      {/* Development Status Indicator */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-3 py-2 rounded-full text-xs font-medium shadow-lg ${
            Object.values(loading).some(Boolean) 
              ? 'bg-yellow-100 text-yellow-800' 
              : Object.values(errors).some(Boolean) 
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
          }`}>
            {Object.values(loading).some(Boolean) ? '🔄 Loading...' : 
             Object.values(errors).some(Boolean) ? '❌ Connection Issues' : '✅ Connected'}
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;