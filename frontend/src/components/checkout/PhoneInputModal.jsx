// components/checkout/PhoneInputModal.jsx - UPDATED
import React, { useState, useEffect } from 'react';

export default function PhoneInputModal({
  isOpen = false,
  onSubmit = () => {},
  onClose = () => {},
  initialPhone = ''
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState('');

  // Reset phone when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      setError('');
    }
  }, [isOpen, initialPhone]);

  // Handle phone number formatting
  const handlePhoneChange = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as user types (07 XXX XXX XXX)
    if (digits.length <= 3) {
      setPhone(digits);
    } else if (digits.length <= 6) {
      setPhone(`${digits.slice(0, 3)} ${digits.slice(3)}`);
    } else {
      setPhone(`${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`);
    }
    
    // Clear error when user types
    if (error) setError('');
  };

  // Validate phone number
  const validatePhone = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (!digits) {
      return 'Phone number is required';
    }
    
    if (digits.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    
    if (!digits.startsWith('07') && !digits.startsWith('01')) {
      return 'Please enter a valid Kenyan number starting with 07 or 01';
    }
    
    return '';
  };

  const handleSave = () => {
    const validationError = validatePhone(phone);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Submit the cleaned phone number (digits only)
    const cleanedPhone = phone.replace(/\D/g, '');
    onSubmit(cleanedPhone);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-input-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 
            id="phone-input-modal-title" 
            className="text-xl font-semibold text-gray-900"
          >
            Enter Phone Number for MPESA
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            We'll send an MPESA payment prompt to this number. 
            Make sure it's the number associated with your Safaricom MPESA account.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">+254</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="7XX XXX XXX"
                className="pl-16 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Format: 07XXXXXXXX or 01XXXXXXXX
            </p>
            {error && (
              <p className="text-red-600 text-sm mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue with MPESA
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Your phone number is only used for this payment</span>
          </div>
        </div>
      </div>
    </div>
  );
}