import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { productAPI, cartAPI } from '../../services/api';

const ProductDetails = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const response = await productAPI.getBySlug(slug);
      setProduct(response.data.data.product);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const addToCart = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      await cartAPI.addItem({
        productId: product.id,
        quantity: quantity
      });
      alert('Product added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return <div className="min-h-screen bg-gray-50 py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div>
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-gray-400">Product Image</span>
              </div>
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">{product.name}</h1>
              
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-2xl font-bold text-blue-600">₹{product.price}</span>
                {product.salePrice && (
                  <span className="text-lg text-gray-500 line-through">₹{product.salePrice}</span>
                )}
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">{product.description}</p>
                
                {product.prescriptionRequired && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-700 font-semibold">📋 Prescription Required</p>
                    <p className="text-red-600 text-sm">This product requires a valid prescription from a doctor.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">SKU:</span> {product.sku}
                  </div>
                  <div>
                    <span className="font-semibold">Stock:</span> {product.stock} units
                  </div>
                  <div>
                    <span className="font-semibold">Brand:</span> {product.brand?.name}
                  </div>
                  <div>
                    <span className="font-semibold">Category:</span> {product.category?.name}
                  </div>
                </div>
              </div>

              {/* Ingredients & Usage */}
              {product.ingredients && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Ingredients:</h3>
                  <p className="text-gray-600 text-sm">{product.ingredients}</p>
                </div>
              )}

              {product.usageInstructions && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Usage Instructions:</h3>
                  <p className="text-gray-600 text-sm">{product.usageInstructions}</p>
                </div>
              )}

              {/* Add to Cart */}
              <div className="border-t pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <label className="font-semibold">Quantity:</label>
                  <select 
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="border rounded px-3 py-2"
                  >
                    {[...Array(Math.min(10, product.stock))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={addToCart}
                  disabled={loading || product.stock === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;