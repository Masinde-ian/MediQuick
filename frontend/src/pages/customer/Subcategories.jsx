import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { categoryAPI, productAPI } from '../../services/api';
import ProductCard, { ProductGrid, ProductCardSkeleton } from '../../components/ProductCard';
import Notification from '../../components/Notification';
import { ChevronRight, Grid, List, Filter, ChevronDown } from 'lucide-react';

const Subcategories = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCategoryAndProducts();
    }
  }, [slug]);

  const fetchCategoryAndProducts = async () => {
    setLoading(true);
    try {
      // Fetch category and products in parallel
      const [categoryResponse, productsResponse] = await Promise.all([
        categoryAPI.getTree(),
        productAPI.getByCategory(slug)
      ]);

      const allCategories = categoryResponse.data.data.categories;
      const foundCategory = findCategoryBySlug(allCategories, slug);
      setCategory(foundCategory);
      setProducts(productsResponse.data.data.products || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
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
          <Link to="/categories" className="text-blue-600 hover:text-blue-800">
            ← Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Notification />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link to="/categories" className="hover:text-blue-600">Categories</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-gray-800 font-medium truncate max-w-xs">
              {category.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-600 text-lg max-w-3xl">
              {category.description}
            </p>
          )}
        </div>

        {/* Subcategories Section */}
        {category.children && category.children.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Subcategories</h2>
              <span className="text-gray-500 text-sm">
                {category.children.length} subcategories
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {category.children.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/categories/${subcategory.slug}`}
                  className="group bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-500 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                    <span className="text-xl">🔬</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 text-sm">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Products in {category.name}
              </h2>
              <p className="text-gray-600 mt-1">
                {productCount} {productCount === 1 ? 'product' : 'products'} available
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="Grid view"
                >
                  <Grid className={`w-4 h-4 ${viewMode === 'grid' ? 'text-blue-600' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="List view"
                >
                  <List className={`w-4 h-4 ${viewMode === 'list' ? 'text-blue-600' : 'text-gray-400'}`} />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortOptions(!showSortOptions)}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
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
            </div>
          </div>

          {/* Products Grid/List */}
          {productCount === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                There are no products available in this category at the moment.
              </p>
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse All Categories
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
            <ProductGrid columns={4} className="gap-6">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAddToCart={true}
                  showWishlist={true}
                />
              ))}
            </ProductGrid>
          ) : (
            // List View
            <div className="space-y-4">
              {sortedProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-500 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={product.images ? `/products/${JSON.parse(product.images)[0]?.split('/').pop()?.replace(/['"]/g, '')}` : '/placeholder-product.jpg'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {product.name}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                            {product.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-blue-600">
                              KSh {(product.salePrice || product.price)?.toLocaleString()}
                            </span>
                            {product.salePrice && product.salePrice < product.price && (
                              <span className="text-sm text-gray-400 line-through">
                                KSh {product.price?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Add to Cart */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            // Add to cart logic
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Add to Cart
                        </button>
                      </div>
                      
                      {/* Additional Info */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
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
                </Link>
              ))}
            </div>
          )}

          {/* Load More (if applicable) */}
          {productCount > 20 && (
            <div className="text-center mt-12">
              <button className="bg-white border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                Load More Products
              </button>
            </div>
          )}
        </div>

        {/* Category Description Footer */}
        {category.description && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">About {category.name}</h3>
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-600 leading-relaxed">
                {category.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subcategories;