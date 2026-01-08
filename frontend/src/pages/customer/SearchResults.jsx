import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { Search, Filter, ChevronDown, Loader, X, RotateCcw } from 'lucide-react';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    initial: true,
    loadingMore: false
  });
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);

  // Fetch ALL products from database without pagination for search
  const fetchAllProductsForSearch = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    setError('');
    setProducts([]);
    setIsSearching(true);
    setSearchAttempted(true);

    try {
      console.log('🔍 Starting deep search for:', query);
      
      // Method 1: Try dedicated search endpoint first (if available)
      try {
        console.log('🔄 Attempting dedicated search endpoint...');
        const searchResponse = await productAPI.search({ q: query });
        console.log('✅ Search endpoint response:', searchResponse);
        
        if (searchResponse.data) {
          let searchResults = [];
          
          if (searchResponse.data.success && searchResponse.data.data?.products) {
            searchResults = searchResponse.data.data.products;
          } else if (Array.isArray(searchResponse.data)) {
            searchResults = searchResponse.data;
          } else if (searchResponse.data.products) {
            searchResults = searchResponse.data.products;
          }
          
          if (searchResults.length > 0) {
            console.log(`✅ Found ${searchResults.length} products via search endpoint`);
            setProducts(searchResults);
            return;
          }
        }
      } catch (searchError) {
        console.log('⚠️ Search endpoint failed, trying alternative methods...', searchError.message);
      }
      
      // Method 2: Fetch ALL products with large limit
      console.log('🔄 Fetching all products for client-side search...');
      let allProducts = [];
      let page = 1;
      const limit = 100; // Maximum per request
      let hasMoreProducts = true;
      let totalFetched = 0;
      
      // Fetch multiple pages until we get all products
      while (hasMoreProducts && totalFetched < 1000) { // Safety limit: 1000 products
        try {
          console.log(`📥 Fetching page ${page}...`);
          const response = await productAPI.getAll({ 
            page: page,
            limit: limit
          });
          
          let productsData = [];
          
          // Parse response
          if (response.data) {
            if (response.data.success && response.data.data?.products) {
              productsData = response.data.data.products;
            } else if (response.data.success && Array.isArray(response.data.data)) {
              productsData = response.data.data;
            } else if (response.data.products && Array.isArray(response.data.products)) {
              productsData = response.data.products;
            } else if (Array.isArray(response.data)) {
              productsData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              productsData = response.data.data;
            }
          }
          
          console.log(`📦 Page ${page}: ${productsData.length} products`);
          
          if (productsData.length === 0) {
            hasMoreProducts = false;
            break;
          }
          
          allProducts = [...allProducts, ...productsData];
          totalFetched += productsData.length;
          
          // If we got fewer products than the limit, we've reached the end
          if (productsData.length < limit) {
            hasMoreProducts = false;
            break;
          }
          
          page++;
          
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (pageError) {
          console.error(`❌ Error fetching page ${page}:`, pageError);
          hasMoreProducts = false;
          break;
        }
      }
      
      console.log(`📊 Total products fetched: ${allProducts.length}`);
      
      // Filter products locally
      if (query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        console.log(`🔍 Filtering ${allProducts.length} products for: "${searchTerm}"`);
        
        const filteredProducts = allProducts.filter(product => {
          if (!product) return false;
          
          const name = (product.name || '').toLowerCase();
          const description = (product.description || '').toLowerCase();
          const brand = (product.brand?.name || product.brand || '').toLowerCase();
          const category = (product.category?.name || product.category || '').toLowerCase();
          const sku = (product.sku || '').toLowerCase();
          const tags = Array.isArray(product.tags) ? product.tags.join(' ').toLowerCase() : '';
          
          // Return true if any field contains the search term
          return name.includes(searchTerm) ||
                 description.includes(searchTerm) ||
                 brand.includes(searchTerm) ||
                 category.includes(searchTerm) ||
                 sku.includes(searchTerm) ||
                 tags.includes(searchTerm);
        });
        
        console.log(`✅ Found ${filteredProducts.length} matching products`);
        setProducts(filteredProducts);
      } else {
        // If no search query, show all products
        console.log('📋 Showing all products (no search query)');
        setProducts(allProducts);
      }
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      setError(`Search failed: ${error.message || 'Please try again'}`);
      setProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
      setIsSearching(false);
    }
  };

  // Trigger search when query changes
  useEffect(() => {
    if (query !== undefined) {
      console.log('🔄 Search query updated:', query);
      const debounceTimer = setTimeout(() => {
        fetchAllProductsForSearch();
      }, 300); // Debounce to prevent rapid API calls
      
      return () => clearTimeout(debounceTimer);
    }
  }, [query]);

  // Manual search function
  const handleManualSearch = () => {
    fetchAllProductsForSearch();
  };

  // Clear search
  const handleClearSearch = () => {
    navigate('/search?q=');
  };

  // Sort products
  const getSortedProducts = () => {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0));
      case 'price-high':
        return sorted.sort((a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0));
      case 'name-asc':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-desc':
        return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      default:
        return sorted;
    }
  };

  const sortedProducts = getSortedProducts();

  if (loading.initial) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
            {[...Array(10)].map((_, i) => (
              <ProductCardSkeleton key={`skeleton-${i}-${Date.now()}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Search Controls */}
        <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    const newQuery = e.target.value;
                    navigate(`/search?q=${encodeURIComponent(newQuery)}`);
                  }}
                  placeholder="Search for products, brands, categories..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {query && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleManualSearch}
                disabled={isSearching || !query.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Again</span>
                  </>
                )}
              </button>
              
              {products.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSortOptions(!showSortOptions)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-6 py-3 font-medium hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4" />
                    Sort
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSortOptions ? 'rotate-180' : ''}`} />
                  </button>

                  {showSortOptions && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSortOptions(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {[
                          { value: 'default', label: 'Relevance' },
                          { value: 'price-low', label: 'Price: Low to High' },
                          { value: 'price-high', label: 'Price: High to Low' },
                          { value: 'name-asc', label: 'Name: A to Z' },
                          { value: 'name-desc', label: 'Name: Z to A' },
                          { value: 'newest', label: 'Newest First' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value);
                              setShowSortOptions(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                              sortBy === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Results Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {query ? `"${query}"` : 'All Products'}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-600">
                  {products.length} {products.length === 1 ? 'product' : 'products'} found
                </p>
                {isSearching && (
                  <span className="flex items-center gap-2 text-blue-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    Searching...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Search className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Search Error</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={fetchAllProductsForSearch}
                  className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchAttempted && products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No products found
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We couldn't find any products matching <span className="font-medium">"{query}"</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleClearSearch}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium hover:bg-gray-200"
              >
                Clear Search
              </button>
              <Link
                to="/categories"
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        ) : (
          <>
            {products.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
                {sortedProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.id || product._id || `product-${index}`}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                    product={product}
                    showAddToCart={true}
                    showWishlist={true}
                  />
                ))}
              </div>
            )}

            {/* Empty state when no search attempted */}
            {!searchAttempted && !query && (
              <div className="text-center py-12 bg-white rounded-2xl">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={40} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Start Searching
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Enter a product name, brand, or category to find what you're looking for
                </p>
                <div className="inline-flex flex-col items-center gap-4">
                  <div className="text-sm text-gray-500">Try searching for:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Panadol', 'Aveeno', 'Garnier', 'Nivea', 'Colgate'].map((term) => (
                      <button
                        key={term}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(term)}`)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Search Tips */}
        {query && products.length > 0 && (
          <div className="mt-12 bg-blue-50 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Search Tips</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-blue-800">For better results:</h4>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-start gap-3">
                    <span className="mt-1">•</span>
                    <span>Use specific brand names (e.g., "Panadol" instead of "painkillers")</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">•</span>
                    <span>Check spelling or try common variations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">•</span>
                    <span>Use fewer words for broader results</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-blue-800">Can't find what you need?</h4>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-start gap-3">
                    <span className="mt-1">•</span>
                    <span>Browse by <Link to="/categories" className="font-medium hover:underline">Category</Link></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">•</span>
                    <span>Browse by <Link to="/brands" className="font-medium hover:underline">Brand</Link></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1">•</span>
                    <span>Contact customer support for assistance</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;