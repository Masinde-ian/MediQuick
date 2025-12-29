import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginCheck = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('LoginCheck - User:', user);
    console.log('LoginCheck - Loading:', loading);
    console.log('LoginCheck - Token:', localStorage.getItem('token'));
  }, [user, loading]);

  if (loading) return <div>Checking auth...</div>;

  return (
    <div style={{ position: 'fixed', top: 10, right: 10, background: 'white', padding: 10, border: '1px solid #ccc', zIndex: 1000 }}>
      <strong>Auth Status:</strong><br />
      User: {user ? user.email : 'Not logged in'}<br />
      Token: {localStorage.getItem('token') ? 'Exists' : 'Missing'}
    </div>
  );
};

export default LoginCheck;