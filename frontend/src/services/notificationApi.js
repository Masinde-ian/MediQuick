import api from './api';

// Helper function to check authentication
const checkAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('🔐 Not authenticated, skipping notification API call');
    return false;
  }
  return true;
};

// Helper function to handle 401 errors gracefully
const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    console.log('🔐 Session expired or not authenticated for notifications');
    return null; // Return null to indicate auth issue
  }
  throw error; // Re-throw other errors
};

export const notificationApi = {
  // Get notifications with auth check
  getNotifications: (params = {}) => {
    if (!checkAuth()) {
      return Promise.resolve({ 
        notifications: [], 
        pagination: { total: 0, unreadCount: 0 } 
      });
    }
    
    return api.get('/notifications', { params })
      .then(res => res.data.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { notifications: [], pagination: { total: 0, unreadCount: 0 } };
        }
        console.error('Get notifications error:', error);
        return { notifications: [], pagination: { total: 0, unreadCount: 0 } };
      });
  },

  // Get notification stats with auth check
  getStats: () => {
    if (!checkAuth()) {
      return Promise.resolve({ total: 0, unread: 0 });
    }
    
    return api.get('/notifications/stats')
      .then(res => res.data.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { total: 0, unread: 0 };
        }
        console.error('Get stats error:', error);
        return { total: 0, unread: 0 };
      });
  },

  // Mark as read with auth check
  markAsRead: (id) => {
    if (!checkAuth()) {
      return Promise.resolve({ success: false, message: 'Not authenticated' });
    }
    
    return api.patch(`/notifications/${id}/read`)
      .then(res => res.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { success: false, message: 'Not authenticated' };
        }
        console.error('Mark as read error:', error);
        return { success: false, message: 'Failed to mark as read' };
      });
  },

  // Mark all as read with auth check
  markAllAsRead: () => {
    if (!checkAuth()) {
      return Promise.resolve({ success: false, message: 'Not authenticated' });
    }
    
    return api.patch('/notifications/read-all')
      .then(res => res.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { success: false, message: 'Not authenticated' };
        }
        console.error('Mark all as read error:', error);
        return { success: false, message: 'Failed to mark all as read' };
      });
  },

  // Delete notification with auth check
  deleteNotification: (id) => {
    if (!checkAuth()) {
      return Promise.resolve({ success: false, message: 'Not authenticated' });
    }
    
    return api.delete(`/notifications/${id}`)
      .then(res => res.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { success: false, message: 'Not authenticated' };
        }
        console.error('Delete notification error:', error);
        return { success: false, message: 'Failed to delete notification' };
      });
  },

  // Clear all notifications with auth check
  clearAll: () => {
    if (!checkAuth()) {
      return Promise.resolve({ success: false, message: 'Not authenticated' });
    }
    
    return api.delete('/notifications/clear-all')
      .then(res => res.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { success: false, message: 'Not authenticated' };
        }
        console.error('Clear all error:', error);
        return { success: false, message: 'Failed to clear notifications' };
      });
  },

  // Get notification preferences with auth check
  getPreferences: () => {
    if (!checkAuth()) {
      return Promise.resolve({ preferences: null });
    }
    
    return api.get('/notifications/preferences')
      .then(res => res.data.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { preferences: null };
        }
        console.error('Get preferences error:', error);
        return { preferences: null };
      });
  },

  // Update notification preferences with auth check
  updatePreferences: (data) => {
    if (!checkAuth()) {
      return Promise.resolve({ success: false, message: 'Not authenticated' });
    }
    
    return api.put('/notifications/preferences', data)
      .then(res => res.data)
      .catch(error => {
        const authError = handleAuthError(error);
        if (authError === null) {
          return { success: false, message: 'Not authenticated' };
        }
        console.error('Update preferences error:', error);
        return { success: false, message: 'Failed to update preferences' };
      });
  },

  // Setup polling for notifications with auth awareness
  setupPolling: (callback, interval = 10000) => {
    let pollingInterval;
    let isAuthenticated = checkAuth();
    
    const startPolling = () => {
      // Update auth status
      isAuthenticated = checkAuth();
      
      if (!isAuthenticated) {
        console.log('🔐 Not authenticated, skipping notification polling');
        if (callback) {
          callback([]); // Send empty array to callback
        }
        return;
      }
      
      // Initial fetch
      notificationApi.getNotifications().then(data => {
        if (callback && data.notifications) {
          callback(data.notifications);
        }
      });
      
      // Set up interval with auth check
      pollingInterval = setInterval(() => {
        const currentAuth = checkAuth();
        if (!currentAuth) {
          console.log('🔐 Lost authentication during polling, stopping...');
          stopPolling();
          if (callback) {
            callback([]); // Send empty array to callback
          }
          return;
        }
        
        notificationApi.getNotifications().then(data => {
          if (callback && data.notifications) {
            callback(data.notifications);
          }
        });
      }, interval);
    };
    
    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
    
    return { startPolling, stopPolling };
  },

  // Simple polling helper (for use in useEffect) with auth check
  startPolling: (callback, interval = 10000) => {
    let intervalId;
    
    const poll = () => {
      if (!checkAuth()) {
        console.log('🔐 Not authenticated, skipping notification poll');
        if (callback) {
          callback([]); // Send empty array to callback
        }
        return;
      }
      
      notificationApi.getNotifications().then(data => {
        if (callback && data.notifications) {
          callback(data.notifications);
        }
      });
    };
    
    // Initial poll with auth check
    if (checkAuth()) {
      poll();
    } else if (callback) {
      callback([]); // Send empty array immediately if not authenticated
    }
    
    // Set up interval
    intervalId = setInterval(poll, interval);
    
    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }
};