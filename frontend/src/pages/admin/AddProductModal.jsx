import React, { useState, useCallback } from 'react';

const AddProductModal = React.memo(({ isOpen, onClose, onSave, categories, brands }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    salePrice: '',
    sku: '',
    categoryId: '',
    brandId: '',
    prescriptionRequired: false,
    ingredients: '',
    usageInstructions: '',
    images: '[]',
    inStock: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : 
              value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const generateSlug = useCallback(() => {
    const name = formData.name.trim();
    if (name) {
      const slug = name
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Valid price is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data
      const productData = {
        ...formData,
        salePrice: formData.salePrice || null,
        brandId: formData.brandId || null
      };
      
      await onSave(productData);
      // Reset form on success
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: 0,
        salePrice: '',
        sku: '',
        categoryId: '',
        brandId: '',
        prescriptionRequired: false,
        ingredients: '',
        usageInstructions: '',
        images: '[]',
        inStock: true
      });
      setErrors({});
    } catch (error) {
      console.error('Error adding product:', error);
      // Handle API errors
      if (error.message.includes('slug')) {
        setErrors(prev => ({ ...prev, slug: 'Slug already exists' }));
      } else if (error.message.includes('SKU')) {
        setErrors(prev => ({ ...prev, sku: 'SKU already exists' }));
      } else {
        alert(error.message || 'Failed to add product');
      }
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, onSave]);

  const handleAddImage = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) {
      try {
        const images = JSON.parse(formData.images || '[]');
        images.push(url);
        setFormData(prev => ({ ...prev, images: JSON.stringify(images) }));
      } catch {
        setFormData(prev => ({ ...prev, images: JSON.stringify([url]) }));
      }
    }
  }, [formData.images]);

  const handleRemoveImage = useCallback((index) => {
    try {
      const images = JSON.parse(formData.images || '[]');
      images.splice(index, 1);
      setFormData(prev => ({ ...prev, images: JSON.stringify(images) }));
    } catch {
      setFormData(prev => ({ ...prev, images: '[]' }));
    }
  }, [formData.images]);

  const parseImages = useCallback(() => {
    try {
      return JSON.parse(formData.images || '[]');
    } catch {
      return [];
    }
  }, [formData.images]);

  if (!isOpen) return null;

  const images = parseImages();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Add New Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className={`flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                        errors.slug ? 'border-red-500' : 'border-gray-300'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={generateSlug}
                      disabled={loading}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
                    >
                      Generate
                    </button>
                  </div>
                  {errors.slug && (
                    <p className="mt-1 text-xs text-red-600">{errors.slug}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU (Unique) *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors.sku ? 'border-red-500' : 'border-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {errors.sku && (
                    <p className="mt-1 text-xs text-red-600">{errors.sku}</p>
                  )}
                </div>
              </div>

              {/* Pricing & Category */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Pricing & Category</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (KSh) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-red-600">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price (KSh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors.categoryId ? 'border-red-500' : 'border-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    name="brandId"
                    value={formData.brandId}
                    onChange={handleChange}
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">No Brand</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Medical Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingredients
                  </label>
                  <textarea
                    name="ingredients"
                    value={formData.ingredients}
                    onChange={handleChange}
                    rows="3"
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Instructions
                  </label>
                  <textarea
                    name="usageInstructions"
                    value={formData.usageInstructions}
                    onChange={handleChange}
                    rows="3"
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="prescriptionRequired"
                    checked={formData.prescriptionRequired}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Prescription Required
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={formData.inStock}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    In Stock
                  </span>
                </label>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Images</h3>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddImage}
                    disabled={loading}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, images: '[]' }))}
                    disabled={loading}
                    className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Clear All Images
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                        onError={(e) => {
                          e.target.src = '/placeholder.jpg';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={loading}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Images JSON (Advanced)
                </label>
                <textarea
                  name="images"
                  value={formData.images}
                  onChange={handleChange}
                  rows="2"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder='["image1.jpg", "image2.jpg"]'
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

AddProductModal.displayName = 'AddProductModal';

export default AddProductModal;