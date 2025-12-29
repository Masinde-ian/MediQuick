import React from 'react';
import { MapPinIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function AddressSection({
  selectedAddress,
  addresses = [],
  onAddAddress,
  onSelectAddress
}) {
  if (!selectedAddress && addresses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="text-center py-8">
          <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Address Added</h3>
          <p className="text-gray-500 mb-4">Add a delivery address to continue</p>
          <button
            onClick={onAddAddress}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Delivery Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Delivery Address</h2>
        <button
          onClick={onAddAddress}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add New Address
        </button>
      </div>

      {/* Selected Address Display */}
      {selectedAddress && (
        <div className="mb-6 p-4 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{selectedAddress.label || 'My Address'}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state}
                    {selectedAddress.zipCode && `, ${selectedAddress.zipCode}`}
                  </div>
                  {selectedAddress.phone && (
                    <div className="text-sm text-gray-600 mt-1">
                      📱 {selectedAddress.phone}
                    </div>
                  )}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Selected
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Addresses */}
      {addresses.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Other Addresses</h3>
          <div className="space-y-3">
            {addresses
              .filter(addr => addr.id !== selectedAddress?.id)
              .map(address => (
                <div
                  key={address.id}
                  onClick={() => onSelectAddress(address)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{address.label || 'Address'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {address.street}, {address.city}, {address.state}
                        {address.zipCode && `, ${address.zipCode}`}
                      </div>
                      {address.phone && (
                        <div className="text-sm text-gray-600 mt-1">
                          📱 {address.phone}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAddress(address);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}