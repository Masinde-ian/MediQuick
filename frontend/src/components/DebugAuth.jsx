import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DebugAuth = () => {
  const { user, loading } = useAuth();

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h3 className="font-bold">Auth Debug Info:</h3>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>User: {user ? JSON.stringify(user) : 'No user'}</p>
      <p>Token in localStorage: {localStorage.getItem('token') || 'No token'}</p>
    </div>
  );
};

export default DebugAuth;