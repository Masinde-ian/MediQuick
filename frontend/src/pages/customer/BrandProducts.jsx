import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { brandAPI, productAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { ChevronLeft, Search, Filter, ShoppingBag, ChevronDown, Loader } from 'lucide-react';

const BrandProducts = () => {
  const { slug } = useParams();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    initial: true,
    loadingMore: false
  });
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const productsPerPage = 20;

  useEffect(() => {
    if (slug) {
      fetchBrandData();
      fetchProducts(1);
    }
  }, [slug]);

  const fetchBrandData = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    setError(null);
    
    try {
      const brandResponse = await brandAPI.getBySlug(slug);
      setBrand(brandResponse.data?.data?.brand || brandResponse.data?.brand);
    } catch (error) {
      console.error('Error fetching brand data:', error);
      setError('Failed to load brand information');
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  const fetchProducts = async (pageNumber = 1, loadMore = false) => {
    if (loadMore) {
      setLoading(prev => ({ ...prev, loadingMore: true }));
    } else {
      setLoading(prev => ({ ...prev, initial: true }));
    }
    
    setError(null);
    
    try {
      const productsResponse = await productAPI.getByBrand(slug, {
        page: pageNumber,
        limit: productsPerPage
      });
      
      let productsData = [];
      let responseTotal = 0;
      
      // Parse different response structures
      if (productsResponse.data?.data?.products) {
        productsData = productsResponse.data.data.products;
        responseTotal = productsResponse.data.data.total || productsResponse.data.data.count || 0;
      } else if (productsResponse.data?.products) {
        productsData = productsResponse.data.products;
        responseTotal = productsResponse.data.total || productsResponse.data.count || 0;
      } else if (Array.isArray(productsResponse.data)) {
        productsData = productsResponse.data;
        responseTotal = productsResponse.data.length;
      } else if (Array.isArray(productsResponse.data?.data)) {
        productsData = productsResponse.data.data;
        responseTotal = productsResponse.data.total || productsResponse.data.data.length || 0;
      }
      
      if (Array.isArray(productsData)) {
        if (loadMore) {
          // Append new products to existing ones
          setProducts(prev => [...prev, ...productsData]);
        } else {
          // Set initial products
          setProducts(productsData);
        }
        
        // Determine if there are more products to load
        if (productsData.length < productsPerPage) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        
        // Update page state
        setPage(pageNumber);
      }
    } catch (error) {
      console.error('Error fetching brand products:', error);
      setError('Failed to load products');
      if (!loadMore) {
        setProducts([]);
      }
    } finally {
      if (loadMore) {
        setLoading(prev => ({ ...prev, loadingMore: false }));
      } else {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    fetchProducts(nextPage, true);
  };

  // Filter products by search query
  const filteredProducts = searchQuery
    ? products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  // Sort products based on selected option
  const getSortedProducts = () => {
    const sorted = [...filteredProducts];
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
      case 'price-high':
        return sorted.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'popular':
        return sorted.sort((a, b) => (b.popularity || b.rating || 0) - (a.popularity || a.rating || 0));
      default:
        return sorted;
    }
  };

  const sortedProducts = getSortedProducts();

  if (loading.initial && !brand) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <Link to="/brands" className="p-2">
              <ChevronLeft size={24} />
            </Link>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Brand info skeleton */}
          <div className="bg-white rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
          
          {/* Products skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
            {[...Array(10)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Brand Not Found</h1>
          <p className="text-gray-600 mb-8">
            {error || "This brand doesn't exist"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                fetchBrandData();
                fetchProducts(1);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
            >
              Try Again
            </button>
            <Link
              to="/brands"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium text-center"
            >
              Back to Brands
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Link 
            to="/brands" 
            className="p-2 -ml-2 active:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </Link>
          
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[40%]">
            {brand.name}
          </h1>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {showSearch ? (
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 flex-1 max-w-[180px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="bg-transparent outline-none text-sm flex-1"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="text-gray-500 ml-2"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 active:bg-gray-100 rounded-full"
              >
                <Search size={20} className="text-gray-600" />
              </button>
            )}
            
            <button
              onClick={() => setShowSortOptions(!showSortOptions)}
              className="p-2 active:bg-gray-100 rounded-full relative"
            >
              <Filter size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Sort Dropdown */}
        {showSortOptions && (
          <div className="absolute right-4 top-16 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48">
            {[
              { value: 'default', label: 'Default' },
              { value: 'price-low', label: 'Price: Low to High' },
              { value: 'price-high', label: 'Price: High to Low' },
              { value: 'name-asc', label: 'Name: A to Z' },
              { value: 'name-desc', label: 'Name: Z to A' },
              { value: 'newest', label: 'Newest First' },
              { value: 'popular', label: 'Most Popular' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setShowSortOptions(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${
                  sortBy === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Brand Info Card */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl text-blue-600">🏢</span>
              </div>
            )}
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{brand.name}</h2>
              
              {brand.description && (
                <p className="text-gray-600 text-sm mb-3">
                  {brand.description}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm text-gray-500">
                  {products.length} product{products.length !== 1 ? 's' : ''} available
                </span>
                
                <div className="flex gap-3">
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      Website
                    </a>
                  )}
                  {brand.country && (
                    <span className="text-sm text-gray-500">
                      • {brand.country}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Searching for: "{searchQuery}"
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 text-sm hover:text-blue-700"
              >
                Clear
              </button>
            </div>
            <span className="text-sm text-gray-600">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Products Section */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {searchQuery ? 'Search Results' : 'Products'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>
            
            {filteredProducts.length > 0 && (
              <button
                onClick={() => setShowSortOptions(!showSortOptions)}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 w-full sm:w-auto justify-center sm:justify-start"
              >
                <Filter className="w-4 h-4" />
                Sort: {sortBy === 'default' ? 'Default' : 
                      sortBy === 'price-low' ? 'Price Low to High' :
                      sortBy === 'price-high' ? 'Price High to Low' :
                      sortBy === 'name-asc' ? 'Name A to Z' :
                      sortBy === 'name-desc' ? 'Name Z to A' :
                      sortBy === 'newest' ? 'Newest First' : 'Most Popular'}
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Products Grid */}
          {loading.initial && products.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
              {[...Array(10)].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No Search Results' : 'No Products Available'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? `No products found matching "${searchQuery}"`
                  : `No products available for ${brand.name} at the moment.`
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
                  >
                    Clear Search
                  </button>
                )}
                <Link
                  to="/brands"
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium text-center"
                >
                  Browse Brands
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
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
              {hasMore && !searchQuery && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading.loadingMore}
                    className="bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium hover:bg-blue-700 transition flex items-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 min-w-[160px] sm:min-w-[200px]"
                  >
                    {loading.loadingMore ? (
                      <>
                        <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span className="text-sm sm:text-base">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm sm:text-base">Load More</span>
                        <ChevronDown size={16} className="sm:w-5 sm:h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Product Stats */}
              {!hasMore && products.length > 0 && !searchQuery && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
                    <span className="text-sm text-gray-600">
                      Showing all <span className="font-bold text-blue-600">{products.length}</span> products
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      All products loaded
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandProducts;