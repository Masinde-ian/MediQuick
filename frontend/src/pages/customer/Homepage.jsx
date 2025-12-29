import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryAPI, productAPI, conditionAPI } from '../../services/api';
import ProductCard, { ProductCardSkeleton, ProductGrid } from '../../components/ProductCard';
import { Truck, Shield, Pill, Clock, AlertCircle } from 'lucide-react';

const Homepage = () => {
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState({
    categories: true,
    conditions: true,
    products: true
  });
  const [errors, setErrors] = useState({
    categories: null,
    conditions: null,
    products: null
  });

  useEffect(() => {
    fetchCategories();
    fetchConditions();
    fetchFeaturedProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(prev => ({ ...prev, categories: true }));
      setErrors(prev => ({ ...prev, categories: null }));
      
      const response = await categoryAPI.getAll();
      console.log('Categories API response:', response); // Debug log
      
      // Handle different response structures safely
      let categoriesData = [];
      
      if (response.data) {
        // Case 1: { success: true, data: [...] }
        if (response.data.success && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        }
        // Case 2: { success: true, data: { categories: [...] } }
        else if (response.data.success && response.data.data?.categories) {
          categoriesData = response.data.data.categories;
        }
        // Case 3: { categories: [...] }
        else if (Array.isArray(response.data.categories)) {
          categoriesData = response.data.categories;
        }
        // Case 4: Direct array response
        else if (Array.isArray(response.data)) {
          categoriesData = response.data;
        }
        // Case 5: Nested in data property
        else if (Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        }
      }
      
      console.log('Processed categories data:', categoriesData); // Debug log
      
      // Make sure we have an array before filtering
      if (!Array.isArray(categoriesData)) {
        console.error('Categories data is not an array:', categoriesData);
        setCategories([]);
        return;
      }
      
      // Get top-level categories (level 0 or 1) that are leaf categories
      const topCategories = categoriesData
        .filter(cat => {
          // Handle missing properties safely
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
      setCategories([]); // Set empty array on error
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const fetchConditions = async () => {
    try {
      setLoading(prev => ({ ...prev, conditions: true }));
      setErrors(prev => ({ ...prev, conditions: null }));
      
      const response = await conditionAPI.getAll();
      console.log('Conditions API response:', response); // Debug log
      
      // Handle different response structures safely
      let conditionsData = [];
      
      if (response.data) {
        // Case 1: { success: true, data: [...] }
        if (response.data.success && Array.isArray(response.data.data)) {
          conditionsData = response.data.data;
        }
        // Case 2: { success: true, data: { conditions: [...] } }
        else if (response.data.success && response.data.data?.conditions) {
          conditionsData = response.data.data.conditions;
        }
        // Case 3: { conditions: [...] }
        else if (Array.isArray(response.data.conditions)) {
          conditionsData = response.data.conditions;
        }
        // Case 4: Direct array response
        else if (Array.isArray(response.data)) {
          conditionsData = response.data;
        }
        // Case 5: Nested in data property
        else if (Array.isArray(response.data.data)) {
          conditionsData = response.data.data;
        }
      }
      
      console.log('Processed conditions data:', conditionsData); // Debug log
      
      // Make sure we have an array
      if (!Array.isArray(conditionsData)) {
        console.error('Conditions data is not an array:', conditionsData);
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
      setConditions([]); // Set empty array on error
    } finally {
      setLoading(prev => ({ ...prev, conditions: false }));
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      setErrors(prev => ({ ...prev, products: null }));
      
      const response = await productAPI.getAll({ limit: 8, featured: true });
      console.log('Products API response:', response); // Debug log
      
      // Handle different response structures safely
      let productsData = [];
      
      if (response.data) {
        // Case 1: { success: true, data: { products: [...] } }
        if (response.data.success && Array.isArray(response.data.data?.products)) {
          productsData = response.data.data.products;
        }
        // Case 2: { success: true, data: [...] }
        else if (response.data.success && Array.isArray(response.data.data)) {
          productsData = response.data.data;
        }
        // Case 3: { products: [...] }
        else if (Array.isArray(response.data.products)) {
          productsData = response.data.products;
        }
        // Case 4: Direct array response
        else if (Array.isArray(response.data)) {
          productsData = response.data;
        }
        // Case 5: Nested in data property
        else if (Array.isArray(response.data.data)) {
          productsData = response.data.data;
        }
      }
      
      console.log('Processed products data:', productsData); // Debug log
      
      // Make sure we have an array
      if (!Array.isArray(productsData)) {
        console.error('Products data is not an array:', productsData);
        setFeaturedProducts([]);
        return;
      }
      
      setFeaturedProducts(productsData.slice(0, 8));
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrors(prev => ({ 
        ...prev, 
        products: error.code === 'ERR_NETWORK' 
          ? 'Unable to connect to server. Please check your connection.'
          : 'Failed to load products. Please try again later.'
      }));
      setFeaturedProducts([]); // Set empty array on error
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  // Loading skeleton components
  const CategorySkeleton = () => (
    <div className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
      <div className="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
    </div>
  );

  const ConditionSkeleton = () => (
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
      'pain': '⚡',
      'cold': '🥶',
      'fever': '🤒',
      'allergy': '🤧',
      'digestive': '🤢',
      'skin': '🤕',
      'vitamins': '💊',
      'baby': '👶',
      'women': '👩',
      'men': '👨',
      'first aid': '🩹',
      'diabetes': '🩸'
    };

    if (!name) return '💊';
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    return '💊';
  };

  // Safely get product count
  const getProductCount = (item) => {
    if (!item) return 0;
    return item.productCount || item._count?.products || item.products?.length || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Your Trusted Online Pharmacy
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Get genuine medicines delivered to your doorstep with our fast and reliable service
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/categories" 
                className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-center hover:bg-gray-100 transition duration-300 active:scale-95 shadow-lg"
              >
                Shop Medicines
              </Link>
              <Link 
                to="/conditions" 
                className="bg-blue-500 text-white px-8 py-4 rounded-full font-semibold text-center hover:bg-blue-400 transition duration-300 active:scale-95 border border-white/20"
              >
                Shop by Condition
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
              <div className="text-2xl font-bold text-blue-600">2000+</div>
              <div className="text-sm text-gray-600">Medicines</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">24/7</div>
              <div className="text-sm text-gray-600">Support</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600">Genuine</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">Fast</div>
              <div className="text-sm text-gray-600">Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop by Category</h2>
              <p className="text-gray-600">Browse medicines by category</p>
            </div>
            <Link 
              to="/categories" 
              className="text-blue-600 font-medium hover:text-blue-700"
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
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
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

      {/* Conditions Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop by Health Condition</h2>
              <p className="text-gray-600">Find medications for specific health needs</p>
            </div>
            <Link 
              to="/conditions" 
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          
          {errors.conditions ? (
            <ErrorMessage 
              message={errors.conditions} 
              onRetry={fetchConditions}
              icon={Pill}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {loading.conditions
                ? Array.from({ length: 8 }).map((_, index) => (
                    <ConditionSkeleton key={index} />
                  ))
                : conditions.length > 0 ? (
                  conditions.map((condition) => (
                    <Link
                      key={condition.id || condition._id || Math.random()}
                      to={`/conditions/${condition.slug}`}
                      className="bg-white rounded-2xl p-4 hover:shadow-md transition-all duration-300 active:scale-[0.98] active:shadow-inner border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Pill size={20} className="text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                            {condition.name || 'Condition'}
                          </h3>
                          <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                            {condition.description || `Medications for ${condition.name || 'this condition'}`}
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
                    No conditions available
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Products</h2>
              <p className="text-gray-600">Top recommended medicines</p>
            </div>
            <Link 
              to="/products" 
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          
          {errors.products ? (
            <ErrorMessage 
              message={errors.products} 
              onRetry={fetchFeaturedProducts}
              icon={AlertCircle}
            />
          ) : loading.products ? (
            <ProductGrid columns={2} className="gap-3">
              {[...Array(8)].map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </ProductGrid>
          ) : featuredProducts.length > 0 ? (
            <ProductGrid columns={2} className="gap-3">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id || product._id || Math.random()}
                  product={product}
                  showAddToCart={true}
                  showWishlist={true}
                />
              ))}
            </ProductGrid>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Pill size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Featured Products</h3>
              <p className="text-gray-600 mb-4">Check back later for featured products</p>
              <Link
                to="/categories"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Why Choose MediQuick</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-3">Fast Delivery</h3>
              <p className="text-gray-600">
                Get your medicines delivered within 24-48 hours in major cities
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-3">100% Genuine</h3>
              <p className="text-gray-600">
                All medicines are sourced from licensed pharmacies and verified for authenticity
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Our pharmacists are available round the clock to assist you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Prescription Medicines?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Upload your prescription and get your medicines delivered safely and securely
          </p>
          <Link 
            to="/prescriptions" 
            className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold inline-block hover:bg-gray-100 transition duration-300 active:scale-95 shadow-lg"
          >
            Upload Prescription
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-blue-50">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-2xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 text-sm mb-2">
                  Medical Disclaimer
                </h4>
                <p className="text-blue-700 text-xs leading-relaxed">
                  This information is for educational purposes only. Always consult with a qualified healthcare professional before starting any new medication or treatment. Do not disregard professional medical advice or delay in seeking it because of something you have read here.
                </p>
              </div>
            </div>
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