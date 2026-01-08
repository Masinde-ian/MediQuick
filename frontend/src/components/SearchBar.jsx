import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const SearchBar = ({ mobile = false, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with query parameter
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      
      // Call onSearch callback if provided (for mobile menu closing)
      if (onSearch) {
        onSearch();
      }
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !mobile) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search medicines, brands, conditions..."
          className={`
            w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
            text-sm shadow-sm
            ${mobile ? 'text-base' : ''}
          `}
          aria-label="Search products"
        />
        <Search 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
          size={20} 
        />
        {!mobile && (
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Search
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;