import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, RefreshCw } from 'lucide-react';
import { notificationApi } from '../services/notificationApi';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const intervalRef = useRef(null);

  // Check authentication status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      const authStatus = checkAuthStatus();
      setIsAuthenticated(authStatus);
      
      // Clear notifications if logged out
      if (!authStatus) {
        setNotifications([]);
        setUnreadCount(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Initial check
    handleAuthChange();

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === null) {
        handleAuthChange();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Check auth status periodically
    const authCheckInterval = setInterval(handleAuthChange, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(authCheckInterval);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    // Don't fetch if not authenticated or already loading
    if (!isAuthenticated || isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('🔔 Fetching notifications...');
      const data = await notificationApi.getNotifications({ limit: 10 });
      
      // Handle response based on API structure
      if (data && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.pagination?.unreadCount || 0);
      } else if (data && Array.isArray(data)) {
        // Handle array response
        setNotifications(data);
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } else {
        // Empty or invalid response
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling when authenticated
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isAuthenticated) {
      // Initial fetch
      fetchNotifications();
      
      // Set up polling every 30 seconds
      intervalRef.current = setInterval(fetchNotifications, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id) => {
    if (!isAuthenticated) return;
    
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!isAuthenticated || unreadCount === 0) return;
    
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!isAuthenticated) return;
    
    try {
      await notificationApi.deleteNotification(id);
      const deletedNotif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch (error) {
      return '';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ORDER_CONFIRMED':
        return '✅';
      case 'ORDER_SHIPPED':
        return '🚚';
      case 'ORDER_DELIVERED':
        return '📬';
      case 'PAYMENT_SUCCESS':
        return '💰';
      case 'PAYMENT_FAILED':
        return '❌';
      case 'LOW_STOCK_ALERT':
        return '⚠️';
      case 'NEW_ORDER_ADMIN':
        return '📥';
      case 'ACCOUNT_UPDATE':
        return '👤';
      case 'PROMOTION':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'ORDER_CONFIRMED':
      case 'PAYMENT_SUCCESS':
      case 'ORDER_DELIVERED':
        return '#10b981'; // green
      case 'PAYMENT_FAILED':
        return '#ef4444'; // red
      case 'LOW_STOCK_ALERT':
        return '#f59e0b'; // amber
      default:
        return '#3b82f6'; // blue
    }
  };

  // If not authenticated, show simple disabled bell
  if (!isAuthenticated) {
    return (
      <div className="notification-bell">
        <button
          className="bell-button disabled"
          disabled
          aria-label="Notifications (login required)"
          title="Login to view notifications"
        >
          <Bell size={24} className="text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="notification-bell">
      <button
        className={`bell-button ${unreadCount > 0 ? 'has-notifications' : ''}`}
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) {
            fetchNotifications();
          }
        }}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {isLoading && <span className="loading-dot"></span>}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div 
            className="dropdown-backdrop" 
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="notification-dropdown">
            <div className="dropdown-header">
              <div className="header-left">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <span className="unread-count">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="header-actions">
                <button
                  onClick={fetchNotifications}
                  className="icon-btn refresh-btn"
                  title="Refresh"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-btn mark-all-btn"
                    disabled={isLoading}
                  >
                    <Check size={14} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="icon-btn close-btn"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <Bell size={40} className="empty-icon" />
                  <p className="empty-text">No notifications yet</p>
                  <p className="empty-subtext">
                    We'll notify you when something important happens
                  </p>
                  <button 
                    onClick={fetchNotifications}
                    className="refresh-btn-small"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    style={{
                      '--notification-color': getNotificationColor(notification.type)
                    }}
                  >
                    <div 
                      className="notification-icon"
                      style={{ color: getNotificationColor(notification.type) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        {notification.title}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {formatTime(notification.createdAt || notification.timestamp)}
                      </div>
                    </div>
                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="icon-btn action-btn"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="icon-btn action-btn delete-btn"
                        title="Delete notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="dropdown-footer">
                <a 
                  href="/notifications" 
                  className="view-all-link"
                  onClick={(e) => {
                    e.preventDefault();
                    // Handle view all - could navigate or show more
                    console.log('View all notifications');
                    setShowDropdown(false);
                  }}
                >
                  View all notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;