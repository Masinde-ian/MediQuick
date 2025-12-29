import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { brandAPI } from '../../services/api';

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getAll();
      setBrands(response.data.data.brands);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 py-8">Loading brands...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">All Brands</h1>
        <p className="text-gray-600 mb-8">Discover products from trusted pharmaceutical brands</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/brands/${brand.slug}`}
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition group"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition">
                <span className="text-2xl">🏢</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{brand.name}</h3>
              <p className="text-gray-500 text-sm">
                {brand._count?.products || 0} products
              </p>
            </Link>
          ))}
        </div>

        {brands.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-2xl font-semibold mb-2">No Brands Available</h2>
            <p className="text-gray-600">Check back later for our brand partners.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Brands;