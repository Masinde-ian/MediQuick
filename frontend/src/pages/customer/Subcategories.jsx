import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { categoryAPI, productAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import Notification from '../../components/Notification';
import { ChevronRight, Grid, List, Filter, ChevronDown, Loader, ArrowLeft } from 'lucide-react';

const Subcategories = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    category: true,
    products: true,
    loadingMore: false
  });
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const productsPerPage = 20;

  useEffect(() => {
    if (slug) {
      fetchCategoryData();
      fetchProducts(1);
    }
  }, [slug]);

  const fetchCategoryData = async () => {
    setLoading(prev => ({ ...prev, category: true }));
    try {
      const response = await categoryAPI.getTree();
      const allCategories = response.data.data.categories;
      const foundCategory = findCategoryBySlug(allCategories, slug);
      
      if (foundCategory) {
        setCategory(foundCategory);
        // Extract subcategories if they exist
        if (foundCategory.children && foundCategory.children.length > 0) {
          setSubcategories(foundCategory.children);
        }
      }
    } catch (error) {
      console.error('Error fetching category:', error);
    } finally {
      setLoading(prev => ({ ...prev, category: false }));
    }
  };

  const fetchProducts = async (pageNumber = 1, loadMore = false) => {
    if (loadMore) {
      setLoading(prev => ({ ...prev, loadingMore: true }));
    } else {
      setLoading(prev => ({ ...prev, products: true }));
    }

    try {
      const response = await productAPI.getByCategory(slug, {
        page: pageNumber,
        limit: productsPerPage
      });

      let productsData = [];
      let responseTotal = 0;

      // Parse response structure
      if (response.data) {
        // Structure 1: { success: true, data: { products: [...], total: X } }
        if (response.data.success && response.data.data?.products) {
          productsData = response.data.data.products;
          responseTotal = response.data.data.total || response.data.data.count || 0;
        }
        // Structure 2: { success: true, data: [...] }
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
      console.error('Error fetching products:', error);
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

  const findCategoryBySlug = (categories, targetSlug) => {
    for (const category of categories) {
      if (category.slug === targetSlug) return category;
      if (category.children) {
        const found = findCategoryBySlug(category.children, targetSlug);
        if (found) return found;
      }
    }
    return null;
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
  const productCount = products.length;

  // Loading state
  if (loading.category && loading.products) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Notification />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-10 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
              {[...Array(10)].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Category not found</h2>
          <Link to="/categories" className="text-blue-600 hover:text-blue-800 flex items-center justify-center gap-2">
            <ArrowLeft size={16} />
            Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Notification />
      
      {/* Breadcrumb - Responsive */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <nav className="flex items-center text-xs sm:text-sm text-gray-600 overflow-x-auto">
            <Link to="/" className="hover:text-blue-600 whitespace-nowrap">Home</Link>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-1 sm:mx-2 flex-shrink-0" />
            <Link to="/categories" className="hover:text-blue-600 whitespace-nowrap">Categories</Link>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-1 sm:mx-2 flex-shrink-0" />
            <span className="text-gray-800 font-medium truncate max-w-[150px] sm:max-w-xs whitespace-nowrap">
              {category.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Category Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-600 text-sm sm:text-lg max-w-3xl">
              {category.description}
            </p>
          )}
        </div>

        {/* Subcategories Section */}
        {subcategories.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Subcategories</h2>
              <span className="text-gray-500 text-sm">
                {subcategories.length} subcategories
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/categories/${subcategory.slug}`}
                  className="group bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center hover:border-blue-500 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:bg-blue-100 transition-colors">
                    <span className="text-lg sm:text-xl">🔬</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 text-xs sm:text-sm">
                    {subcategory.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {subcategory._count?.products || 0} products
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        <div>
          {/* Products Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Products in {category.name}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                {productCount} {productCount === 1 ? 'product' : 'products'} available
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 sm:p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="Grid view"
                >
                  <Grid className={`w-3 h-3 sm:w-4 sm:h-4 ${viewMode === 'grid' ? 'text-blue-600' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 sm:p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="List view"
                >
                  <List className={`w-3 h-3 sm:w-4 sm:h-4 ${viewMode === 'list' ? 'text-blue-600' : 'text-gray-400'}`} />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortOptions(!showSortOptions)}
                  className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-200 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap"
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                  Sort
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${showSortOptions ? 'rotate-180' : ''}`} />
                </button>

                {showSortOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortOptions(false)}></div>
                    <div className="absolute right-0 mt-1 w-40 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
                          className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 ${
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
            </div>
          </div>

          {/* Products Grid/List */}
          {loading.products && products.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3">
              {[...Array(10)].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : productCount === 0 ? (
            <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl sm:text-2xl">🔍</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-600 text-sm sm:text-base mb-6 max-w-md mx-auto px-4">
                There are no products available in this category at the moment.
              </p>
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Browse All Categories
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
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
            </>
          ) : (
            // List View
            <>
              <div className="space-y-3 sm:space-y-4">
                {sortedProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="block bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-blue-500 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images && JSON.parse(product.images)[0] ? (
                          <img
                            src={`/products/${JSON.parse(product.images)[0]?.split('/').pop()?.replace(/['"]/g, '')}`}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1">
                              {product.name}
                            </h3>
                            <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 mb-2">
                              {product.description}
                            </p>
                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                              <span className="text-base sm:text-xl font-bold text-blue-600">
                                KSh {(product.salePrice || product.price)?.toLocaleString()}
                              </span>
                              {product.salePrice && product.salePrice < product.price && (
                                <span className="text-xs sm:text-sm text-gray-400 line-through">
                                  KSh {product.price?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick Add to Cart - Desktop */}
                          <div className="hidden sm:block">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                // Add to cart logic
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm"
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                        
                        {/* Additional Info */}
                        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
                          {product.brand && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              {product.brand.name}
                            </span>
                          )}
                          {product.prescriptionRequired && (
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded">
                              Prescription Required
                            </span>
                          )}
                          {!product.inStock && (
                            <span className="text-red-500">Out of Stock</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Add to Cart - Mobile */}
                    <div className="sm:hidden mt-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          // Add to cart logic
                        }}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </Link>
                ))}
                
                {/* Show skeletons while loading more in list view */}
                {loading.loadingMore && 
                  [...Array(productsPerPage)].map((_, index) => (
                    <div key={`skeleton-${index}`} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
              
              {/* Load More Button for List View */}
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
            </>
          )}

          {/* Category Description Footer */}
          {category.description && (
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">About {category.name}</h3>
              <div className="prose prose-blue max-w-none">
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {category.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subcategories;