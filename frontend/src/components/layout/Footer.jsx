// components/layout/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Package, User, ShoppingCart, Phone, Mail, Shield, FileText } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Logo and Tagline */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MQ</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MediQuick</span>
          </div>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            Your trusted pharmacy delivered fast. Genuine medications, reliable service.
          </p>
        </div>

        {/* Quick Action Links */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link 
            to="/" 
            className="flex flex-col items-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Home size={20} className="text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Home</span>
          </Link>
          
          <Link 
            to="/categories" 
            className="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
          >
            <Package size={20} className="text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Categories</span>
          </Link>
          
          <Link 
            to="/my-account" 
            className="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <User size={20} className="text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Account</span>
          </Link>
          
          <Link 
            to="/cart" 
            className="flex flex-col items-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <ShoppingCart size={20} className="text-orange-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Cart</span>
          </Link>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center mb-3">
            <Shield size={16} className="text-green-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">Verified Pharmacy</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-gray-600 text-sm">
              <Phone size={14} className="mr-2" />
              <span>+254 700 123 456</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Mail size={14} className="mr-2" />
              <span>help@mediquick.com</span>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
            Privacy
          </a>
          <span className="text-gray-300">•</span>
          <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
            Terms
          </a>
          <span className="text-gray-300">•</span>
          <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
            Safety
          </a>
          <span className="text-gray-300">•</span>
          <Link to="/faq" className="text-xs text-gray-500 hover:text-gray-700">
            FAQ
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} MediQuick Pharmacy. All medicines dispensed by licensed pharmacists.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            FDA Approved • Prescription Required Where Applicable
          </p>
        </div>
      </div>

      {/* App-Style Bottom Navigation (Optional - for mobile feel) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
        <div className="flex justify-around py-3">
          <Link to="/" className="flex flex-col items-center">
            <Home size={20} className="text-gray-600 mb-1" />
            <span className="text-xs text-gray-600">Home</span>
          </Link>
          
          <Link to="/categories" className="flex flex-col items-center">
            <Package size={20} className="text-gray-600 mb-1" />
            <span className="text-xs text-gray-600">Shop</span>
          </Link>
          
          <Link to="/cart" className="flex flex-col items-center">
            <div className="relative">
              <ShoppingCart size={20} className="text-gray-600 mb-1" />
              {/* Cart count badge would go here */}
            </div>
            <span className="text-xs text-gray-600">Cart</span>
          </Link>
          
          <Link to="/my-account" className="flex flex-col items-center">
            <User size={20} className="text-gray-600 mb-1" />
            <span className="text-xs text-gray-600">Account</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;