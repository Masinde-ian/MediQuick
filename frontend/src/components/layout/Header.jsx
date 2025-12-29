import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../NotificationBell';
import { 
  Menu, 
  X, 
  ShoppingCart, 
  User, 
  Search, 
  ChevronDown,
  Home,
  Package,
  HeartPulse,
  Tag,
  ClipboardList,
  Pill
} from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/products', { 
        state: { searchQuery: searchQuery.trim() } 
      });
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  // Navigation items with icons
  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={18} /> },
    { path: '/categories', label: 'Categories', icon: <Package size={18} /> },
    { path: '/conditions', label: 'Conditions', icon: <HeartPulse size={18} /> },
    { path: '/brands', label: 'Brands', icon: <Tag size={18} /> },
    { path: '/my-orders', label: 'My Orders', icon: <ClipboardList size={18} /> },
  ];

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
        isScrolled ? 'shadow-lg border-b border-gray-200' : 'border-b border-gray-100'
      }`}>
        <div className="container mx-auto px-4 lg:px-8">
          {/* Top Bar - Logo, Search, Actions */}
          <div className="flex items-center justify-between h-20">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMenu}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3" onClick={closeAllMenus}>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-bold text-gray-900">MediQuick</span>
                  <p className="text-xs text-gray-500">Online Pharmacy</p>
                </div>
              </Link>
            </div>

            {/* Search Bar - Desktop (Centered) */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search medicines, brands, conditions..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                  />
                  <Search 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Desktop Actions - Right Side */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              {/* Notification Bell */}
              <div className="hidden lg:block">
                <NotificationBell />
              </div>

              {/* Cart - Desktop */}
              <Link 
                to="/cart" 
                className="hidden lg:flex items-center space-x-2 p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors relative group"
              >
                <div className="relative">
                  <ShoppingCart size={22} />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    0
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Cart</span>
                  <span className="text-xs text-gray-500">Ksh 0.00</span>
                </div>
              </Link>

              {/* User Actions */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl transition-colors group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-sm group-hover:shadow">
                      <span className="text-white font-bold text-sm">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden xl:flex flex-col items-start">
                      <span className="text-sm font-medium">{user.name || 'User'}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">{user.email}</span>
                    </div>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                      <div className="px-4 py-3 border-b">
                        <p className="font-medium">{user.name || 'User'}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/my-account"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User size={18} />
                        <span>My Account</span>
                      </Link>
                      <Link
                        to="/my-orders"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <ClipboardList size={18} />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        to="/prescriptions"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <span className="w-5">📄</span>
                        <span>Prescriptions</span>
                      </Link>
                      <div className="border-t my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-b-xl"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden lg:flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-blue-600 px-4 py-2 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm hover:shadow font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Cart Icon */}
              <Link 
                to="/cart" 
                className="lg:hidden p-2 text-gray-700 hover:text-blue-600 relative"
              >
                <ShoppingCart size={22} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </Link>
              
              {/* Mobile User Icon */}
              {user ? (
                <button
                  onClick={toggleDropdown}
                  className="lg:hidden p-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="lg:hidden p-2 text-gray-700 hover:text-blue-600"
                >
                  <User size={22} />
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Navigation Bar */}
          <div className="hidden lg:flex items-center justify-center border-t border-gray-100 py-3">
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                >
                  {item.icon}
                  <span className="font-medium text-sm">{item.label}</span>
                  <div className="h-0.5 w-0 group-hover:w-full bg-blue-600 transition-all duration-300 rounded-full mt-1"></div>
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile Search Bar */}
          <div className="lg:hidden py-4 border-t border-gray-100">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines, brands, conditions..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
              />
              <Search 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20} 
              />
            </form>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeAllMenus}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="p-6 border-b">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center">
                    <Pill className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-900">MediQuick</span>
                    <p className="text-sm text-gray-500">Online Pharmacy</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="p-6 border-b bg-blue-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-lg">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name || 'User'}</p>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-6">
                <ul className="space-y-2">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                        onClick={closeAllMenus}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          {item.icon}
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                  
                  {/* Additional Mobile Items */}
                  <li>
                    <Link
                      to="/prescriptions"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                      onClick={closeAllMenus}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600">📄</span>
                      </div>
                      <span className="font-medium">Prescriptions</span>
                    </Link>
                  </li>
                  
                  {user && (
                    <>
                      <li>
                        <Link
                          to="/my-account"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                          onClick={closeAllMenus}
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User size={18} className="text-blue-600" />
                          </div>
                          <span className="font-medium">My Account</span>
                        </Link>
                      </li>
                      <li>
                        <div className="px-4 py-3">
                          <NotificationBell mobile onClick={closeAllMenus} />
                        </div>
                      </li>
                    </>
                  )}
                </ul>
              </nav>

              {/* Auth Actions */}
              <div className="p-6 border-t">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                  >
                    Logout
                  </button>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="block w-full text-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors font-medium"
                      onClick={closeAllMenus}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="block w-full text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm font-medium"
                      onClick={closeAllMenus}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </>
  );
};

export default Header;