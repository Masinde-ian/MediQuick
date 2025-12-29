// pages/SearchPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton, ProductGrid } from '../../components/ProductCard';
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    priceMin: '',
    priceMax: '',
    inStock: '',
    prescriptionRequired: ''
  });

  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchTerm) => {
    try {
      setLoading(true);
      setError('');

      const params = {
        q: searchTerm,
        ...(filters.category && { category: filters.category }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.priceMin && { priceMin: filters.priceMin }),
        ...(filters.priceMax && { priceMax: filters.priceMax }),
        ...(filters.inStock && { inStock: filters.inStock === 'true' }),
        ...(filters.prescriptionRequired && { prescriptionRequired: filters.prescriptionRequired === 'true' })
      };

      const response = await productAPI.search(searchTerm, params);
      
      let productsData = [];
      if (response.data?.success) {
        productsData = response.data.data?.products || response.data.data || [];
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data?.products) {
        productsData = response.data.products;
      }

      setProducts(productsData);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Apply filters immediately
    if (query) {
      const params = new URLSearchParams({ q: query });
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      window.location.href = `/search?${params.toString()}`;
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      priceMin: '',
      priceMax: '',
      inStock: '',
      prescriptionRequired: ''
    });
    if (query) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-gray-600 hover:text-blue-600">
              ← Back
            </Link>
            
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicines, brands, conditions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                  size={18} 
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
                >
                  <Search size={18} />
                </button>
              </div>
            </form>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        {showFilters && (
          <div className="border-t bg-white py-4">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Stock Status</label>
                  <select
                    value={filters.inStock}
                    onChange={(e) => handleFilterChange('inStock', e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">In Stock</option>
                    <option value="false">Out of Stock</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Prescription</label>
                  <select
                    value={filters.prescriptionRequired}
                    onChange={(e) => handleFilterChange('prescriptionRequired', e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">Prescription Required</option>
                    <option value="false">No Prescription</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Min Price</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceMin}
                    onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max Price</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceMax}
                    onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="container mx-auto px-4 py-8">
        {!query ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Medicines</h1>
            <p className="text-gray-600 mb-8">
              Enter a search term above to find medicines, brands, or conditions
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-8">
            <div>
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-6 animate-pulse"></div>
              <ProductGrid columns={2} className="gap-3">
                {[...Array(8)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </ProductGrid>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Search Error</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => performSearch(query)}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Search Results for "{query}"
                </h1>
                <p className="text-gray-600 mt-1">
                  Found {products.length} product{products.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filters).map(([key, value]) => {
                    if (!value) return null;
                    let displayValue = value;
                    if (key === 'inStock') displayValue = value === 'true' ? 'In Stock' : 'Out of Stock';
                    if (key === 'prescriptionRequired') displayValue = value === 'true' ? 'RX Required' : 'No RX';
                    
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full"
                      >
                        {key}: {displayValue}
                        <button
                          onClick={() => handleFilterChange(key, '')}
                          className="hover:text-blue-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  No products found for "{query}". Try different search terms or browse categories.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/categories"
                    className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium text-center"
                  >
                    Browse Categories
                  </Link>
                  <Link
                    to="/conditions"
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium text-center"
                  >
                    Browse Conditions
                  </Link>
                </div>
              </div>
            ) : (
              <ProductGrid columns={2} className="gap-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showAddToCart={true}
                    showWishlist={true}
                  />
                ))}
              </ProductGrid>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;