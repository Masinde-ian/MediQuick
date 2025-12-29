// components/checkout/HelpSupportSection.jsx
import React from 'react';

export default function HelpSupportSection() {
  return (
    <div className="bg-white p-4 rounded-lg shadow mt-8">
      <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
      <p className="text-sm text-gray-600">
        Contact our support team if you encounter any issues with your order.
      </p>
      <p className="text-sm text-gray-600 mt-1">
        Email: <a href="mailto:support@example.com" className="text-blue-600 underline">support@example.com</a>
      </p>
      <p className="text-sm text-gray-600">
        Phone: <a href="tel:+254700000000" className="text-blue-600 underline">+254 700 000 000</a>
      </p>
    </div>
  );
}
