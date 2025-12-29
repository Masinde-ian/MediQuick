import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    
    const apiError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: error.response?.status,
      data: error.response?.data
    };
    
    return Promise.reject(apiError);
  }
);

// Export APIs
export const adminAnalyticsAPI = {
  getDashboardStats: () => adminApi.get('/admin/analytics/dashboard'),
};

export const adminInventoryAPI = {
  getAllProducts: (params) => adminApi.get('/admin/inventory/products', { params }),
  getProduct: (id) => adminApi.get(`/admin/inventory/products/${id}`),
  createProduct: (data) => adminApi.post('/admin/inventory/products', data),
  updateProduct: (id, data) => adminApi.put(`/admin/inventory/products/${id}`, data),
  updateStock: (id, data) => adminApi.patch(`/admin/inventory/products/${id}/stock`, data),
  deleteProduct: (id) => adminApi.delete(`/admin/inventory/products/${id}`),
};

export const adminOrdersAPI = {
  getAllOrders: (params) => adminApi.get('/admin/orders', { params }),
  getOrder: (id) => adminApi.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, data) => adminApi.put(`/admin/orders/${id}/status`, data),
};

export const adminUsersAPI = {
  getAllUsers: (params) => adminApi.get('/admin/users', { params }),
};

export const generalAPI = {
  getCategories: () => adminApi.get('/admin/categories'),
  getBrands: () => adminApi.get('/admin/brands'),
};

export default adminApi;