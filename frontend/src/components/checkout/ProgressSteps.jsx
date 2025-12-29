// src/components/checkout/ProgressSteps.jsx
import React from 'react';

const ProgressSteps = ({ selectedAddress }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-8">
        {/* Step 1: Cart */}
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-semibold">
            1
          </div>
          <span className="ml-2 font-medium text-gray-900">Cart</span>
        </div>
        
        <div className="w-16 h-0.5 bg-green-600"></div>
        
        {/* Step 2: Address */}
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
            selectedAddress ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            2
          </div>
          <span className="ml-2 font-medium text-gray-900">Address</span>
        </div>
        
        <div className="w-16 h-0.5 bg-gray-300"></div>
        
        {/* Step 3: Payment */}
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
            selectedAddress ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-500'
          }`}>
            3
          </div>
          <span className={`ml-2 font-medium ${selectedAddress ? 'text-gray-900' : 'text-gray-500'}`}>
            Payment
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProgressSteps;