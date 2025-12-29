// pages/BrandProducts.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { brandAPI, productAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton, ProductGrid } from '../../components/ProductCard';
import { ChevronLeft, Search, Filter, ShoppingBag } from 'lucide-react';

const BrandProducts = () => {
  const { slug } = useParams();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (slug) {
      fetchBrandData();
    }
  }, [slug]);

  const fetchBrandData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const brandResponse = await brandAPI.getBySlug(slug);
      setBrand(brandResponse.data?.data?.brand || brandResponse.data?.brand);
      
      const productsResponse = await productAPI.getByBrand(slug);
      const productsData = productsResponse.data?.data?.products || 
                          productsResponse.data?.products || 
                          [];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching brand data:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <Link to="/brands" className="p-2">
              <ChevronLeft size={24} />
            </Link>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="w-10"></div>
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
          <ProductGrid columns={2} className="gap-3">
            {[...Array(6)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
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
          <Link
            to="/brands"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
          >
            Back to Brands
          </Link>
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
          
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[60%]">
            {brand.name}
          </h1>
          
          <div className="flex items-center gap-2">
            <button className="p-2 active:bg-gray-100 rounded-full">
              <Search size={20} className="text-gray-600" />
            </button>
            <button className="p-2 active:bg-gray-100 rounded-full">
              <Filter size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
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
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {brand.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {products.length} product{products.length !== 1 ? 's' : ''}
                </span>
                
                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 font-medium"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Products
            </h3>
            
            <select className="text-sm text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-2">
              <option>Sort</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest</option>
            </select>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products</h3>
              <p className="text-gray-600 mb-6">
                No products available for this brand
              </p>
              <Link
                to="/brands"
                className="inline-block bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium"
              >
                Browse Brands
              </Link>
            </div>
          ) : (
            <>
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
              
              {/* Load More */}
              {products.length > 10 && (
                <div className="mt-8 text-center">
                  <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-full font-medium active:bg-gray-50">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation (if needed) */}
      {/* <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex justify-around">
          <Link to="/" className="text-center">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/categories" className="text-center">
            <Grid size={24} />
            <span className="text-xs mt-1">Categories</span>
          </Link>
          <Link to="/cart" className="text-center">
            <ShoppingCart size={24} />
            <span className="text-xs mt-1">Cart</span>
          </Link>
          <Link to="/profile" className="text-center">
            <User size={24} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </div> */}
    </div>
  );
};

export default BrandProducts;