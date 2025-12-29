const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mpesaService = require('../services/mpesaService');
const { formatPhoneNumber, generateCheckoutRequestID } = require('../routes/mpesaRoutes');

class MpesaController {
  
  // ============ NEW: INITIATE PAYMENT FLOW ============
  async initiatePaymentFlow(req, res) {
    try {
      const userId = req.user?.id;
      const { phoneNumber, amount, orderData } = req.body;
      
      console.log('💰 Initiating new payment flow:', { 
        userId, 
        phoneNumber: phoneNumber ? '***' + phoneNumber.slice(-3) : 'none',
        amount 
      });

      // Validate order data
      if (!orderData || !orderData.items || orderData.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Order data is required with items'
        });
      }

      // Validate amount
      if (amount < 1 || amount > 70000) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be between KES 1 and KES 70,000'
        });
      }

      // Format phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone || formattedPhone.length !== 12) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format. Use 07XXXXXXXX'
        });
      }

      // Generate unique references
      const checkoutRequestID = generateCheckoutRequestID();
      const accountReference = `ORDER-${Date.now()}`;

      // Validate address exists
      let address = null;
      if (orderData.addressId) {
        address = await prisma.address.findFirst({
          where: {
            id: orderData.addressId,
            userId: userId
          }
        });

        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'Address not found or does not belong to user'
          });
        }
      }

      // Create a temporary order record with PENDING status
      const tempOrder = await prisma.order.create({
        data: {
          userId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'MPESA',
          subtotal: parseFloat(orderData.subtotal) || 0,
          shippingCost: parseFloat(orderData.shippingCost) || 0,
          totalAmount: parseFloat(amount),
          deliveryInstructions: orderData.deliveryInstructions || '',
          contactPhone: formattedPhone,
          checkoutRequestID: checkoutRequestID,
          items: JSON.stringify(orderData.items || []),
          addressId: orderData.addressId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      console.log('✅ Temporary order created:', tempOrder.id);

      // Initiate M-Pesa STK Push
      const stkResponse = await mpesaService.initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: parseFloat(amount),
        accountReference: accountReference,
        transactionDesc: `Payment for Order #${tempOrder.id.substring(0, 8)}`,
        userId,
        orderId: tempOrder.id,
        checkoutRequestID: checkoutRequestID
      });

      if (stkResponse.success) {
        return res.json({
          success: true,
          checkoutRequestID: stkResponse.data.checkoutRequestID,
          message: 'Payment initiated. Check your phone for M-Pesa prompt.',
          orderId: tempOrder.id,
          data: {
            order: {
              id: tempOrder.id,
              totalAmount: tempOrder.totalAmount,
              status: tempOrder.status,
              paymentStatus: tempOrder.paymentStatus,
              contactPhone: tempOrder.contactPhone ? '***' + tempOrder.contactPhone.slice(-3) : null
            },
            payment: {
              checkoutRequestID: stkResponse.data.checkoutRequestID,
              merchantRequestID: stkResponse.data.merchantRequestID
            }
          }
        });
      } else {
        // Delete the temporary order if payment initiation fails
        await prisma.order.delete({ 
          where: { id: tempOrder.id } 
        });
        
        return res.status(400).json({
          success: false,
          error: stkResponse.message || 'Failed to initiate payment'
        });
      }
    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        details: error.message
      });
    }
  }

  // ============ CHECK PAYMENT STATUS ============
  async checkPaymentStatus(req, res) {
    try {
      const { checkoutRequestID } = req.params;
      const userId = req.user?.id;
      
      console.log('🔍 Checking payment status for:', checkoutRequestID);

      // Find transaction
      const transaction = await prisma.transaction.findFirst({
        where: { 
          checkoutRequestID, 
          userId: userId 
        },
        include: { 
          order: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              totalAmount: true,
              orderNumber: true
            }
          } 
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      // If pending, query Safaricom
      if (transaction.status === 'PENDING') {
        try {
          const queryResult = await mpesaService.queryTransaction(checkoutRequestID);
          
          if (queryResult.success && queryResult.data.ResultCode) {
            await mpesaService.processCallback({
              Body: { stkCallback: queryResult.data }
            });
            
            // Refresh transaction
            const updatedTransaction = await prisma.transaction.findFirst({
              where: { checkoutRequestID },
              include: { 
                order: {
                  select: {
                    id: true,
                    status: true,
                    paymentStatus: true,
                    totalAmount: true
                  }
                } 
              }
            });
            
            return res.json({
              success: true,
              status: updatedTransaction.status,
              transaction: {
                id: updatedTransaction.id,
                status: updatedTransaction.status,
                mpesaReceiptNumber: updatedTransaction.mpesaReceiptNumber,
                amount: updatedTransaction.amount,
                phoneNumber: updatedTransaction.phoneNumber ? '***' + updatedTransaction.phoneNumber.slice(-3) : null,
                createdAt: updatedTransaction.createdAt,
                updatedAt: updatedTransaction.updatedAt
              },
              orderId: updatedTransaction.orderId,
              message: updatedTransaction.status === 'COMPLETED' 
                ? 'Payment completed successfully' 
                : `Payment ${updatedTransaction.status.toLowerCase()}`
            });
          }
        } catch (queryError) {
          console.log('Query error (may be normal for pending payments):', queryError.message);
        }
      }

      return res.json({
        success: true,
        status: transaction.status,
        transaction: {
          id: transaction.id,
          status: transaction.status,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          amount: transaction.amount,
          phoneNumber: transaction.phoneNumber ? '***' + transaction.phoneNumber.slice(-3) : null,
          checkoutRequestID: transaction.checkoutRequestID,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        },
        orderId: transaction.orderId,
        orderStatus: transaction.order?.status,
        orderPaymentStatus: transaction.order?.paymentStatus,
        message: transaction.status === 'COMPLETED' 
          ? 'Payment completed successfully' 
          : `Payment ${transaction.status.toLowerCase()}`
      });
    } catch (error) {
      console.error('❌ Status check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Status check failed',
        details: error.message
      });
    }
  }

  // ============ COMPLETE ORDER ============
  async completeOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      
      console.log('🔄 Completing order after payment:', orderId);

      const order = await prisma.order.findFirst({
        where: { 
          id: orderId, 
          userId: userId, 
          status: 'PENDING' 
        },
        include: { 
          transaction: true 
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found or already processed'
        });
      }

      // Check if payment was successful
      if (!order.transaction || order.transaction.status !== 'COMPLETED') {
        // Try to query payment status one more time
        if (order.checkoutRequestID) {
          try {
            const queryResult = await mpesaService.queryTransaction(order.checkoutRequestID);
            if (queryResult.success && queryResult.data.ResultCode) {
              await mpesaService.processCallback({
                Body: { stkCallback: queryResult.data }
              });
              
              // Refresh order data
              const refreshedOrder = await prisma.order.findFirst({
                where: { id: orderId },
                include: { transaction: true }
              });
              
              if (!refreshedOrder.transaction || refreshedOrder.transaction.status !== 'COMPLETED') {
                return res.status(400).json({
                  success: false,
                  error: 'Payment verification failed. Please try again or contact support.'
                });
              }
            } else {
              return res.status(400).json({
                success: false,
                error: 'Payment not completed. Please complete the M-Pesa payment first.'
              });
            }
          } catch (queryError) {
            console.error('Payment verification error:', queryError);
            return res.status(400).json({
              success: false,
              error: 'Payment verification failed. Please try again or contact support.'
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            error: 'Payment not completed or verification pending'
          });
        }
      }

      // Parse the stored items JSON
      const itemsData = JSON.parse(order.items || '[]');
      
      // Create order items
      await Promise.all(
        itemsData.map(async (item) => {
          return await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        })
      );

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          orderNumber: orderNumber,
          items: null, // Clear the temporary items JSON
          updatedAt: new Date()
        },
        include: {
          address: {
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              postalCode: true,
              country: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  price: true
                }
              }
            }
          },
          transaction: {
            select: {
              id: true,
              mpesaReceiptNumber: true,
              amount: true,
              phoneNumber: true,
              status: true,
              createdAt: true
            }
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      // Clear user's cart
      await prisma.cartItem.deleteMany({
        where: { userId: userId }
      });

      console.log('✅ Order completed successfully:', updatedOrder.id);

      return res.json({
        success: true,
        message: 'Order completed successfully',
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          totalAmount: updatedOrder.totalAmount,
          subtotal: updatedOrder.subtotal,
          shippingCost: updatedOrder.shippingCost,
          deliveryInstructions: updatedOrder.deliveryInstructions,
          createdAt: updatedOrder.createdAt,
          address: updatedOrder.address,
          items: updatedOrder.orderItems,
          transaction: updatedOrder.transaction,
          user: updatedOrder.user
        }
      });
    } catch (error) {
      console.error('❌ Complete order error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete order',
        details: error.message
      });
    }
  }

  // ============ LEGACY: INITIATE STK PUSH ============
  async initiateSTKPush(req, res) {
    try {
      const userId = req.user?.id;
      const { phoneNumber, amount, orderId, accountReference, transactionDesc } = req.body;

      console.log('📱 Initiating MPESA STK Push (legacy):', {
        userId, 
        phoneNumber: phoneNumber ? '***' + phoneNumber.slice(-3) : 'none', 
        amount, 
        orderId 
      });

      const result = await mpesaService.initiateSTKPush({
        phoneNumber,
        amount,
        accountReference,
        transactionDesc,
        userId,
        orderId
      });

      if (result.success && orderId && result.data.transactionId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            transactionId: result.data.transactionId,
            paymentStatus: 'PENDING'
          }
        });
        console.log('✅ Order updated with MPESA transaction ID');
      }
      
      return res.json(result);
    } catch (error) {
      console.error('❌ STK Push error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initiate MPESA payment'
      });
    }
  }

  // ============ QUERY PAYMENT STATUS (legacy) ============
  async queryPaymentStatus(req, res) {
    try {
      const { checkoutRequestID } = req.body;
      const userId = req.user?.id;

      console.log('🔍 Querying MPESA status for (legacy):', checkoutRequestID);

      // Query Safaricom for latest status
      const queryResult = await mpesaService.queryTransaction(checkoutRequestID);

      // Process the callback if result is returned
      if (queryResult.success && queryResult.data.ResultCode) {
        await mpesaService.processCallback({ 
          Body: { stkCallback: queryResult.data } 
        });
      }

      // Fetch transaction from database
      const transaction = await prisma.transaction.findFirst({
        where: { checkoutRequestID, userId },
        include: { order: true }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      return res.json({
        success: true,
        data: {
          id: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
          phoneNumber: transaction.phoneNumber ? '***' + transaction.phoneNumber.slice(-3) : null,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          checkoutRequestID: transaction.checkoutRequestID,
          orderId: transaction.orderId,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Query status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to query payment status'
      });
    }
  }

  // ============ HANDLE MPESA CALLBACK ============
  async handleCallback(req, res) {
    try {
      const callbackData = req.body;
      console.log('📞 MPESA Callback received:', JSON.stringify(callbackData, null, 2));

      // Process the callback using service
      const result = await mpesaService.processCallback(callbackData);

      // Send response back to Safaricom
      if (result.success) {
        return res.json({
          ResultCode: 0,
          ResultDesc: "Success"
        });
      } else {
        console.error('❌ Callback processing failed:', result.message);
        return res.json({
          ResultCode: 1,
          ResultDesc: result.message || "Callback processing failed"
        });
      }
    } catch (error) {
      console.error('❌ Callback processing error:', error);
      return res.json({
        ResultCode: 1,
        ResultDesc: "Internal server error"
      });
    }
  }

  // ============ GET USER TRANSACTIONS ============
  async getUserTransactions(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status } = req.query;

      const result = await mpesaService.getUserTransactions(userId, { page, limit, status });

      if (result.success) {
        return res.json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('❌ Get user transactions error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch transactions'
      });
    }
  }

  // ============ GET TRANSACTION BY ID ============
  async getTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'ADMIN';

      const result = await mpesaService.getTransaction(id, isAdmin ? null : userId);

      if (result.success) {
        return res.json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('❌ Get transaction error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction'
      });
    }
  }

  // ============ MPESA HEALTH CHECK ============
  async checkHealth(req, res) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const accessToken = await mpesaService.getAccessToken();

      const healthStatus = {
        success: true,
        service: 'MPESA API',
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        dbConnection: 'ok',
        mpesaToken: accessToken ? 'ok' : 'failed'
      };

      console.log('🩺 MPESA Health check:', healthStatus);
      return res.json(healthStatus);

    } catch (error) {
      console.error('❌ MPESA Health check failed:', error);
      return res.status(500).json({
        success: false,
        service: 'MPESA API',
        status: 'degraded',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export the controller instance
module.exports = new MpesaController();