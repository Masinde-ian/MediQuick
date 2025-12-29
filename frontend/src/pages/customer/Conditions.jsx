// pages/Conditions.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { conditionAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton, ProductGrid } from '../../components/ProductCard';
import { ChevronLeft, AlertCircle, Pill } from 'lucide-react';

const Conditions = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [condition, setCondition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      fetchConditionProducts();
    }
  }, [slug]);

  const fetchConditionProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch condition with products using your API service
      const response = await conditionAPI.getBySlug(slug);
      
      if (response.data?.success) {
        const conditionData = response.data.data;
        setCondition(conditionData);
        
        // Extract products from the response
        if (conditionData.products && Array.isArray(conditionData.products)) {
          setProducts(conditionData.products);
        } else {
          // If products are in a different format
          setProducts(conditionData.products?.map(pc => pc.product) || []);
        }
      } else {
        throw new Error('Failed to fetch condition');
      }
    } catch (error) {
      console.error('Error fetching condition products:', error);
      setError(error.response?.data?.error || 'Failed to load products for this condition. Please try again.');
      setCondition(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <Link to="/conditions" className="p-2">
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
            <ProductGrid columns={2} className="gap-3">
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </ProductGrid>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error Loading Condition</h1>
          <p className="text-gray-600 mb-8 max-w-md">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={fetchConditionProducts}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
            >
              Try Again
            </button>
            <Link
              to="/conditions"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-medium text-center"
            >
              Back to Conditions
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
            <Pill size={24} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Condition Not Found</h1>
          <p className="text-gray-600 mb-8">The condition you're looking for doesn't exist.</p>
          <Link
            to="/conditions"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
          >
            Browse All Conditions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Link to="/conditions" className="p-2 -ml-2 active:bg-gray-100 rounded-full">
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
                <Pill size={32} className="text-blue-600" />
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
                  {products.length} medication{products.length !== 1 ? 's' : ''}
                </span>
                
                <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium">
                  Health Condition
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Recommended Medications
              </h3>
              <p className="text-sm text-gray-600">
                {products.length > 0 
                  ? `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`
                  : 'No products available'
                }
              </p>
            </div>
            
            {products.length > 0 && (
              <select className="text-sm text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-2">
                <option>Sort by: Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Name: A to Z</option>
              </select>
            )}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Pill size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medications Found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We don't have any medications specifically for {condition.name} at the moment.
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
                  Other Conditions
                </Link>
              </div>
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

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertCircle size={18} className="text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 text-sm mb-2">
                Important Medical Disclaimer
              </h4>
              <p className="text-blue-700 text-xs leading-relaxed">
                This information is for educational purposes only. Always consult with a qualified healthcare professional before starting any new medication or treatment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conditions;