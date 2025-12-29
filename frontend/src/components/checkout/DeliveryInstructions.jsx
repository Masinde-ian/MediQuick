// components/checkout/DeliveryInstructions.jsx
import React, { useState } from 'react';

const DeliveryInstructions = ({ 
  instructions = '', 
  onInstructionsChange = () => {},
  maxLength = 500
}) => {
  const [characterCount, setCharacterCount] = useState(instructions.length);

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setCharacterCount(value.length);
      onInstructionsChange(value);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center mb-3">
        <h3 className="text-lg font-semibold">Delivery Instructions</h3>
        <span className="ml-2 text-xs text-gray-500">(Optional)</span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        Add any special delivery instructions for the delivery person. This helps us deliver your order accurately.
      </p>
      
      <textarea
        value={instructions}
        onChange={handleChange}
        placeholder="E.g.: Gate code: 1234#, Leave at security desk, Call before delivery, Apartment 5B, Landmark: Next to supermarket, etc."
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-none"
        maxLength={maxLength}
      />
      
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-500">
          These instructions will be shared with our delivery team
        </p>
        <div className={`text-xs ${characterCount >= maxLength - 10 ? 'text-red-500' : 'text-gray-500'}`}>
          {characterCount}/{maxLength}
        </div>
      </div>

      {/* Example Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-800 mb-2">Helpful Examples:</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <span className="font-medium">Gate codes:</span> "Gate code: 1234#"</li>
          <li>• <span className="font-medium">Security:</span> "Leave at security desk"</li>
          <li>• <span className="font-medium">Contact:</span> "Call 07XXXXXXXX when you arrive"</li>
          <li>• <span className="font-medium">Location:</span> "Apartment 3B, second floor"</li>
          <li>• <span className="font-medium">Timing:</span> "Deliver after 5 PM"</li>
          <li>• <span className="font-medium">Landmarks:</span> "Next to supermarket, blue gate"</li>
          <li>• <span className="font-medium">Alternative:</span> "Leave with neighbor if I'm not home"</li>
        </ul>
      </div>
    </div>
  );
};

export default DeliveryInstructions;