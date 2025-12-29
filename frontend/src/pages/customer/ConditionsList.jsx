// pages/ConditionsList.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { conditionAPI } from '../../services/api';
import { AlertCircle, Pill } from 'lucide-react';

const ConditionsList = () => {
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConditions();
  }, []);

  const fetchConditions = async () => {
    try {
      const response = await conditionAPI.getAll();
      
      if (response.data?.success) {
        const conditionsData = response.data.data;
        setConditions(Array.isArray(conditionsData) ? conditionsData : []);
      } else {
        setConditions(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching conditions:', error);
      setError(error.response?.data?.error || 'Failed to load conditions. Please try again.');
      setConditions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="p-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error Loading Conditions</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={fetchConditions}
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Health Conditions</h1>
          <p className="text-gray-600 text-sm">
            Find medications for specific health needs
          </p>
        </div>
      </div>

      <div className="p-4 pb-20">
        {conditions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Pill size={32} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Conditions Available</h2>
            <p className="text-gray-600 mb-6">Check back later for condition-based shopping.</p>
            <Link
              to="/categories"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-medium"
            >
              Browse Categories
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {conditions.map((condition) => {
                // Get product count
                const productCount = condition.productCount || 
                                   condition.products?.length || 0;
                
                return (
                  <Link
                    key={condition.id}
                    to={`/conditions/${condition.slug}`}
                    className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] active:shadow-inner transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Pill size={20} className="text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                          {condition.name}
                        </h3>
                        <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                          {condition.description || `Medications for ${condition.name}`}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-blue-600 text-xs font-medium">
                            {productCount} product{productCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-blue-600 text-xs">→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <AlertCircle size={14} className="text-blue-600" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 text-xs mb-1">
                    Medical Disclaimer
                  </h4>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Always consult a healthcare professional. This information is for educational purposes only.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConditionsList;