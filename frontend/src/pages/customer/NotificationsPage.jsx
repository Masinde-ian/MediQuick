import React, { useState, useEffect } from 'react';
import { 
  Bell, Check, Trash2, Filter, Settings, 
  Mail, Smartphone, Eye, EyeOff, Calendar,
  Package, CreditCard, AlertCircle, Users,
  TrendingUp, X, CheckCircle, RefreshCw
} from 'lucide-react';
import { notificationApi } from '../../services/notificationApi';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
    
    // Setup polling for new notifications
    const cleanup = notificationApi.startPolling((newNotifications) => {
      // Compare with existing notifications
      const currentIds = new Set(notifications.map(n => n.id));
      const trulyNew = newNotifications.filter(n => !currentIds.has(n.id));
      
      if (trulyNew.length > 0) {
        setNotifications(prev => [...trulyNew, ...prev]);
      }
    }, 15000); // Poll every 15 seconds
    
    return cleanup;
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const data = await notificationApi.getPreferences();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      try {
        await notificationApi.clearAll();
        setNotifications([]);
      } catch (error) {
        console.error('Error clearing all notifications:', error);
      }
    }
  };

  const handleUpdatePreferences = async (updates) => {
    try {
      await notificationApi.updatePreferences(updates);
      setPreferences(updates);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ORDER_CONFIRMED':
      case 'ORDER_SHIPPED':
      case 'ORDER_DELIVERED':
        return <Package size={18} />;
      case 'PAYMENT_SUCCESS':
        return <CreditCard size={18} />;
      case 'LOW_STOCK_ALERT':
        return <AlertCircle size={18} />;
      case 'NEW_ORDER_ADMIN':
        return <Users size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading-container">
          <RefreshCw className="loading-spinner" size={32} />
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div className="header-left">
          <h1>
            <Bell size={24} />
            Notifications
          </h1>
          <p className="page-subtitle">Stay updated with your account activity</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            <Settings size={18} />
            Preferences
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMarkAllAsRead}
            disabled={notifications.filter(n => !n.isRead).length === 0}
          >
            <Check size={18} />
            Mark All Read
          </button>
          <button
            className="btn btn-danger"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
          >
            <Trash2 size={18} />
            Clear All
          </button>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="main-content">
          <div className="list-header">
            <div className="filter-options">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </button>
              <button
                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({notifications.filter(n => !n.isRead).length})
              </button>
              <button
                className="refresh-btn"
                onClick={fetchNotifications}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={64} />
                <h3>No notifications found</h3>
                <p>You're all caught up! Check back later for updates.</p>
              </div>
            ) : (
              notifications
                .filter(notification => 
                  filter === 'all' || 
                  (filter === 'unread' && !notification.isRead)
                )
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h4 className="notification-title">
                          {notification.title}
                        </h4>
                        <div className="notification-time">
                          {formatTime(notification.createdAt)}
                        </div>
                      </div>
                      <p className="notification-message">
                        {notification.message}
                      </p>
                    </div>
                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          className="action-btn mark-read-btn"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(notification.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;