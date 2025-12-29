const notificationController = require('../controllers/notificationController');

class NotificationService {
  // Order notifications
  static async sendOrderConfirmed(userId, orderData) {
    try {
      console.log(`📦 Sending order confirmation for ${orderData.orderNumber}`);
      
      return await notificationController.createNotification(
        userId,
        'ORDER_CONFIRMED',
        'Order Confirmed! ✅',
        `Your order #${orderData.orderNumber} has been confirmed and is being processed.`,
        { 
          orderId: orderData.id, 
          orderNumber: orderData.orderNumber,
          amount: orderData.totalAmount,
          type: 'order'
        }
      );
    } catch (error) {
      console.error('❌ Failed to send order confirmation:', error);
      return null;
    }
  }

  static async sendNewOrderAdmin(orderData) {
    try {
      console.log(`📋 Sending new order notification to admins for ${orderData.orderNumber}`);
      
      return await notificationController.createAdminNotification(
        'NEW_ORDER_ADMIN',
        'New Order Received 📥',
        `New order #${orderData.orderNumber} from customer. Amount: ₹${orderData.totalAmount}`,
        { 
          orderId: orderData.id, 
          orderNumber: orderData.orderNumber, 
          amount: orderData.totalAmount,
          type: 'admin'
        }
      );
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return [];
    }
  }

  // static async sendPaymentSuccess(userId, orderData) {
  //   try {
  //     console.log(`💰 Sending payment success for ${orderData.orderNumber}`);
      
  //     return await notificationController.createNotification(
  //       userId,
  //       'PAYMENT_SUCCESS',
  //       'Payment Successful! 💳',
  //       `Payment of ₹${orderData.totalAmount} for order #${orderData.orderNumber} was successful.`,
  //       { 
  //         orderId: orderData.id, 
  //         orderNumber: orderData.orderNumber, 
  //         amount: orderData.totalAmount,
  //         type: 'payment'
  //       }
  //     );
  //   } catch (error) {
  //     console.error('❌ Failed to send payment success:', error);
  //     return null;
  //   }
  // }

  static async sendOrderShipped(userId, orderData) {
    try {
      console.log(`🚚 Sending shipped notification for ${orderData.orderNumber}`);
      
      return await notificationController.createNotification(
        userId,
        'ORDER_SHIPPED',
        'Order Shipped! 🚚',
        `Your order #${orderData.orderNumber} has been shipped and is on its way.`,
        { 
          orderId: orderData.id, 
          orderNumber: orderData.orderNumber,
          type: 'order'
        }
      );
    } catch (error) {
      console.error('❌ Failed to send shipped notification:', error);
      return null;
    }
  }

  static async sendOrderDelivered(userId, orderData) {
    try {
      console.log(`📬 Sending delivered notification for ${orderData.orderNumber}`);
      
      return await notificationController.createNotification(
        userId,
        'ORDER_DELIVERED',
        'Order Delivered! 📬',
        `Your order #${orderData.orderNumber} has been delivered successfully.`,
        { 
          orderId: orderData.id, 
          orderNumber: orderData.orderNumber,
          type: 'order'
        }
      );
    } catch (error) {
      console.error('❌ Failed to send delivered notification:', error);
      return null;
    }
  }

  // Inventory notifications
  static async sendLowStockAlert(productData) {
    try {
      console.log(`⚠️ Sending low stock alert for ${productData.name}`);
      
      return await notificationController.createAdminNotification(
        'LOW_STOCK_ALERT',
        'Low Stock Alert ⚠️',
        `"${productData.name}" is running low. Current stock: ${productData.stock} units.`,
        { 
          productId: productData.id, 
          productName: productData.name, 
          stock: productData.stock,
          type: 'stock'
        }
      );
    } catch (error) {
      console.error('❌ Failed to send low stock alert:', error);
      return [];
    }
  }

  // Add these methods to your NotificationService class:

  static async sendPaymentSuccess(userId, orderData) {
    try {
      console.log(`💰 Sending payment success for ${orderData.orderNumber}`);
      
      // Send to customer
      const customerNotif = await prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT_SUCCESS',
          title: 'Payment Successful! 💰',
          message: `Your payment of KES ${orderData.totalAmount} for order #${orderData.orderNumber} was successful.`,
          data: {
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            amount: orderData.totalAmount,
            paymentMethod: orderData.paymentMethod
          }
        }
      });

      // Send to admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });

      const adminNotifications = [];
      for (const admin of admins) {
        const notif = await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'PAYMENT_RECEIVED_ADMIN',
            title: 'Payment Received 💳',
            message: `Payment of KES ${orderData.totalAmount} received for order #${orderData.orderNumber}`,
            data: {
              orderId: orderData.id,
              orderNumber: orderData.orderNumber,
              amount: orderData.totalAmount,
              customerId: userId
            }
          }
        });
        adminNotifications.push(notif);
      }

      console.log('✅ Payment success notifications sent');
      return { customerNotif, adminNotifications };

    } catch (error) {
      console.error('❌ Failed to send payment success:', error);
      return null;
    }
  }

  static async sendPaymentFailure(userId, orderData) {
    try {
      console.log(`❌ Sending payment failure for ${orderData.orderNumber}`);
      
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT_FAILED',
          title: 'Payment Failed ❌',
          message: `Your payment for order #${orderData.orderNumber} failed. Please try again.`,
          data: {
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            amount: orderData.totalAmount
          }
        }
      });

      console.log('✅ Payment failure notification sent');
      return notification;

    } catch (error) {
      console.error('❌ Failed to send payment failure:', error);
      return null;
    }
  }

}

module.exports = NotificationService;