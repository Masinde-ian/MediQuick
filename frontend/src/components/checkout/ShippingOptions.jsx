// components/checkout/ShippingOptions.jsx
import React from 'react';

const ShippingOptions = ({ options, selected, onSelect, isLoading, cartTotal }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Shipping Options</h3>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Calculating shipping options...</p>
        </div>
      </div>
    );
  }

  // Safely get shipping options with fallbacks
  const standardOption = options?.standard || {
    id: 'standard',
    name: 'Standard Delivery',
    price: 150,
    cost: 150,
    isFree: false,
    available: true,
    estimate: '3-5 business days'
  };

  const expressOption = options?.express || {
    id: 'express',
    name: 'Express Delivery',
    price: 300,
    cost: 300,
    isFree: false,
    available: cartTotal >= 5000,
    estimate: '1-2 business days'
  };

  // Check if standard shipping should be free
  const finalStandardOption = {
    ...standardOption,
    isFree: cartTotal >= (standardOption.minOrderAmount || 3000),
    cost: cartTotal >= (standardOption.minOrderAmount || 3000) ? 0 : (standardOption.cost || 150)
  };

  // Check if express is available
  const finalExpressOption = {
    ...expressOption,
    available: cartTotal >= (expressOption.minOrderAmount || 5000),
    cost: expressOption.cost || 300
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-3">Shipping Options</h3>
      <div className="space-y-3">
        {/* Standard Delivery */}
        <ShippingOption
          option={finalStandardOption}
          isSelected={selected === 'standard'}
          onSelect={() => onSelect('standard')}
          cartTotal={cartTotal}
        />

        {/* Express Delivery - only show if available */}
        {finalExpressOption.available && (
          <ShippingOption
            option={finalExpressOption}
            isSelected={selected === 'express'}
            onSelect={() => onSelect('express')}
            cartTotal={cartTotal}
          />
        )}
      </div>
    </div>
  );
};

const ShippingOption = ({ option, isSelected, onSelect, cartTotal }) => {
  const getOptionClass = (isSelected) => {
    if (isSelected) {
      return 'border-blue-500 bg-blue-50 ring-2 ring-blue-200';
    }
    return 'border-gray-300 hover:border-blue-400';
  };

  const getTimeText = (option) => {
    return option.estimate || option.estimatedDays || `${option.days || 3-5} business days`;
  };

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${getOptionClass(isSelected)}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <input
            type="radio"
            checked={isSelected}
            onChange={() => {}}
            className="h-5 w-5 text-blue-600"
          />
          <div>
            <div className="font-medium text-gray-900">{option.name}</div>
            <div className="text-sm text-gray-600">{getTimeText(option)}</div>
            {option.minOrderAmount > cartTotal && (
              <div className="text-xs text-gray-500 mt-1">
                Free shipping on orders over KES {option.minOrderAmount.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {option.isFree ? 'FREE' : `KES ${option.cost.toLocaleString()}`}
          </div>
          {option.isFree && cartTotal >= (option.minOrderAmount || 3000) && (
            <div className="text-xs text-green-600 mt-1">Free shipping applied!</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingOptions;