import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { conditionAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { ChevronLeft, AlertCircle, Heart, Loader, Filter, ChevronDown } from 'lucide-react';

const Conditions = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [condition, setCondition] = useState(null);
  const [loading, setLoading] = useState({
    initial: true,
    loadingMore: false
  });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const productsPerPage = 20;

  useEffect(() => {
    if (slug) {
      fetchConditionData();
      fetchConditionProducts(1);
    }
  }, [slug]);

  const fetchConditionData = async () => {
    try {
      setError('');
      const response = await conditionAPI.getBySlug(slug);
      
      if (response.data?.success) {
        const conditionData = response.data.data;
        setCondition(conditionData);
      } else {
        throw new Error('Failed to fetch condition');
      }
    } catch (error) {
      console.error('Error fetching condition:', error);
      setError(error.response?.data?.error || 'Failed to load condition information. Please try again.');
      setCondition(null);
    }
  };

  const fetchConditionProducts = async (pageNumber = 1, loadMore = false) => {
    try {
      if (loadMore) {
        setLoading(prev => ({ ...prev, loadingMore: true }));
      } else {
        setLoading(prev => ({ ...prev, initial: true }));
      }
      
      setError('');
      
      const response = await conditionAPI.getBySlug(slug, {
        page: pageNumber,
        limit: productsPerPage
      });
      
      if (response.data?.success) {
        const conditionData = response.data.data;
        let productsData = [];
        let responseTotal = 0;
        
        // Extract products from response
        if (conditionData.products && Array.isArray(conditionData.products)) {
          productsData = conditionData.products;
        } else if (conditionData.products?.map) {
          productsData = conditionData.products.map(pc => pc.product) || [];
        }
        
        // Get total count if available
        if (conditionData._count?.products) {
          responseTotal = conditionData._count.products;
        } else if (conditionData.totalProducts) {
          responseTotal = conditionData.totalProducts;
        } else {
          responseTotal = productsData.length;
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
      } else {
        throw new Error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching condition products:', error);
      setError(error.response?.data?.error || 'Failed to load products. Please try again.');
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
    fetchConditionProducts(nextPage, true);
  };

  // Sort products based on selected option
  const getSortedProducts = () => {
    const sorted = [...products];
    
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
      default:
        return sorted;
    }
  };

  const sortedProducts = getSortedProducts();

  if (loading.initial && !condition) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <Link to="/wellness" className="p-2">
              <ChevronLeft size={24} />
            </Link>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="w-10"></div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="bg-white rounded-xl p-6 mb-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-7 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
              {[...Array(10)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !condition) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error Loading Wellness Information</h1>
          <p className="text-gray-600 mb-8 max-w-md">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                fetchConditionData();
                fetchConditionProducts(1);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
            >
              Try Again
            </button>
            <Link
              to="/wellness"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium text-center"
            >
              Back to Wellness
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!condition) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={24} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Wellness Area Not Found</h1>
          <p className="text-gray-600 mb-8">The wellness area you're looking for doesn't exist.</p>
          <Link
            to="/wellness"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
          >
            Browse All Wellness Areas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Link to="/wellness" className="p-2 -ml-2 active:bg-gray-100 rounded-full">
            <ChevronLeft size={24} className="text-gray-700" />
          </Link>
          
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[60%]">
            {condition.name}
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                <Heart size={32} className="text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{condition.name}</h2>
              
              {condition.description && (
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {condition.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {products.length} product{products.length !== 1 ? 's' : ''} available
                </span>
                
                <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium">
                  Wellness Solution
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Recommended Products
              </h3>
              <p className="text-sm text-gray-600">
                {products.length > 0 
                  ? `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`
                  : 'No products available'
                }
              </p>
            </div>
            
            {products.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSortOptions(!showSortOptions)}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 w-full sm:w-auto"
                >
                  <Filter className="w-4 h-4" />
                  Sort by
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortOptions ? 'rotate-180' : ''}`} />
                </button>

                {showSortOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortOptions(false)}></div>
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      {[
                        { value: 'default', label: 'Default' },
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
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            sortBy === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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

          {loading.initial && products.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
              {[...Array(10)].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We don't have any products specifically for {condition.name} at the moment.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/categories"
                  className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium text-center"
                >
                  Browse Categories
                </Link>
                <Link
                  to="/wellness"
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium text-center"
                >
                  Other Wellness Areas
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
              {hasMore && (
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
              {products.length > 0 && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
                    <span className="text-sm text-gray-600">
                      Showing <span className="font-bold text-blue-600">{products.length}</span> products
                    </span>
                    {!hasMore && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          All products loaded
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertCircle size={18} className="text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 text-sm mb-2">
                Wellness & Safety Note
              </h4>
              <p className="text-blue-700 text-xs leading-relaxed">
                These products are designed to support your wellness journey. Always consult with a healthcare professional for personalized advice regarding supplements and wellness products.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conditions;