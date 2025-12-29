const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NotificationController {
  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unread = false } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { userId };
      if (unread === 'true') {
        where.isRead = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, isRead: false } })
      ]);

      // Parse JSON data for SQLite
      const parsedNotifications = notifications.map(notification => ({
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null
      }));

      res.json({
        success: true,
        data: {
          notifications: parsedNotifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            total,
            unreadCount
          }
        }
      });
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notifications'
      });
    }
  }

  // Get notification stats
  async getNotificationStats(req, res) {
    try {
      const userId = req.user.id;

      const [total, unread] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } })
      ]);

      res.json({
        success: true,
        data: { total, unread }
      });
    } catch (error) {
      console.error('❌ Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notification stats'
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await prisma.notification.update({
        where: { id, userId },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { 
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : null
        }
      });
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking notification as read'
      });
    }
  }

  // Mark all as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const { count } = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      res.json({
        success: true,
        message: `${count} notification(s) marked as read`
      });
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking all notifications as read'
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await prisma.notification.delete({
        where: { id, userId }
      });

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting notification'
      });
    }
  }

  // Clear all notifications
  async clearAll(req, res) {
    try {
      const userId = req.user.id;

      const { count } = await prisma.notification.deleteMany({
        where: { userId }
      });

      res.json({
        success: true,
        message: `${count} notification(s) cleared`
      });
    } catch (error) {
      console.error('❌ Clear all error:', error);
      res.status(500).json({
        success: false,
        message: 'Error clearing notifications'
      });
    }
  }

  // Create notification (for internal use)
  async createNotification(userId, type, title, message, data = null) {
    try {
      console.log(`📝 Creating ${type} notification for user ${userId}`);
      
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null
        }
      });

      console.log(`✅ Notification created: ${notification.id}`);
      
      // Send real-time update via SSE
      this.sendRealTimeUpdate(userId, notification);
      
      return {
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null
      };
    } catch (error) {
      console.error('❌ Create notification error:', error);
      throw error;
    }
  }

  // Create admin notification
  async createAdminNotification(type, title, message, data = null) {
    try {
      console.log(`📢 Creating admin notification: ${type}`);
      
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true }
      });

      console.log(`👥 Found ${admins.length} admins`);
      
      const notifications = [];
      for (const admin of admins) {
        try {
          const notification = await this.createNotification(
            admin.id, 
            type, 
            title, 
            message, 
            data
          );
          notifications.push(notification);
          console.log(`✅ Admin ${admin.email} notified`);
        } catch (error) {
          console.error(`❌ Failed to notify admin ${admin.id}:`, error);
        }
      }

      return notifications;
    } catch (error) {
      console.error('❌ Create admin notification error:', error);
      throw error;
    }
  }

  // Get notification preferences
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await prisma.notificationPreference.create({
          data: { userId }
        });
      }

      res.json({
        success: true,
        data: { preferences }
      });

      await prisma.$disconnect();
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notification preferences'
      });
    }
  }

  // Update notification preferences
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { 
        emailOrders, emailPromotions, emailStock,
        pushOrders, pushPromotions, pushStock 
      } = req.body;

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      if (!preferences) {
        preferences = await prisma.notificationPreference.create({
          data: { userId }
        });
      }

      preferences = await prisma.notificationPreference.update({
        where: { userId },
        data: {
          emailOrders: emailOrders !== undefined ? emailOrders : preferences.emailOrders,
          emailPromotions: emailPromotions !== undefined ? emailPromotions : preferences.emailPromotions,
          emailStock: emailStock !== undefined ? emailStock : preferences.emailStock,
          pushOrders: pushOrders !== undefined ? pushOrders : preferences.pushOrders,
          pushPromotions: pushPromotions !== undefined ? pushPromotions : preferences.pushPromotions,
          pushStock: pushStock !== undefined ? pushStock : preferences.pushStock
        }
      });

      res.json({
        success: true,
        message: 'Notification preferences updated',
        data: { preferences }
      });

      await prisma.$disconnect();
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating notification preferences'
      });
    }
  }

  // Send real-time update via SSE
  sendRealTimeUpdate(userId, notification) {
    try {
      if (!global.notificationConnections) {
        global.notificationConnections = new Map();
      }
      
      const connections = global.notificationConnections;
      if (connections && connections.has(userId)) {
        const res = connections.get(userId);
        const parsedNotification = {
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : null
        };
        
        res.write(`data: ${JSON.stringify({
          type: 'notification',
          data: parsedNotification
        })}\n\n`);
        
        console.log(`📡 Real-time update sent to user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Send real-time update error:', error);
    }
  }
}

module.exports = new NotificationController();