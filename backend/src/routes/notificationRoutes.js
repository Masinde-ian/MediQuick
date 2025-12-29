const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all notification routes
router.use(authenticate);

// Get user notifications
router.get('/', (req, res) => notificationController.getUserNotifications(req, res));

// Get notification stats
router.get('/stats', (req, res) => notificationController.getNotificationStats(req, res));

// Mark notification as read
router.patch('/:id/read', (req, res) => notificationController.markAsRead(req, res));

// Mark all as read
router.patch('/read-all', (req, res) => notificationController.markAllAsRead(req, res));

// Delete notification
router.delete('/:id', (req, res) => notificationController.deleteNotification(req, res));

// Clear all notifications
router.delete('/clear-all', (req, res) => notificationController.clearAll(req, res));

// Get notification preferences
router.get('/preferences', async (req, res) => {
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
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
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
});

// Server-Sent Events for real-time notifications
router.get('/stream', authenticate, async (req, res) => {
  const userId = req.user.id;
  console.log(`📡 SSE connection requested for user: ${userId}`);

  // Set SSE headers with proper CORS
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    message: 'Notification stream connected',
    userId: userId,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Store connection for this user
  if (!global.notificationConnections) {
    global.notificationConnections = new Map();
  }
  
  global.notificationConnections.set(userId, res);
  console.log(`✅ SSE connection established for user ${userId}`);

  // Send heartbeat every 25 seconds
  const heartbeatInterval = setInterval(() => {
    if (!res.finished) {
      res.write(': heartbeat\n\n');
    }
  }, 25000);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for user ${userId}`);
    clearInterval(heartbeatInterval);
    if (global.notificationConnections) {
      global.notificationConnections.delete(userId);
    }
  });

  // Handle errors
  req.on('error', (error) => {
    console.error(`❌ SSE error for user ${userId}:`, error);
    clearInterval(heartbeatInterval);
    if (global.notificationConnections) {
      global.notificationConnections.delete(userId);
    }
  });
});

module.exports = router;