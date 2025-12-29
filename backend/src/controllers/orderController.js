// backend/src/controllers/orderController.js - UPDATED WITH PRESCRIPTION VALIDATION
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mpesaService = require('../services/mpesaService');
const NotificationService = require('../services/notificationService');

// Generate unique order number
function generateOrderNumber() {
  return "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
}

// Helper function to validate prescription status
async function validatePrescriptionStatus(userId, orderItems) {
  try {
    // Check if order contains prescription drugs
    const productIds = orderItems.map(item => item.productId);
    
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        prescriptionRequired: true
      }
    });

    if (products.length === 0) {
      return {
        valid: true,
        requiresPrescription: false,
        prescriptionItems: []
      };
    }

    // Get user's approved prescriptions
    const approvedPrescriptions = await prisma.prescription.findMany({
      where: {
        userId,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (approvedPrescriptions.length === 0) {
      return {
        valid: false,
        requiresPrescription: true,
        prescriptionItems: products.map(p => ({
          id: p.id,
          name: p.name,
          prescriptionRequired: true
        })),
        message: 'Approved prescription required for medications in your order',
        prescriptionStatus: 'MISSING'
      };
    }

    return {
      valid: true,
      requiresPrescription: true,
      approvedPrescription: approvedPrescriptions[0],
      prescriptionItems: products.map(p => ({
        id: p.id,
        name: p.name,
        prescriptionRequired: true
      })),
      prescriptionStatus: 'APPROVED'
    };

  } catch (error) {
    console.error('Prescription validation error:', error);
    return {
      valid: false,
      requiresPrescription: false,
      error: 'Failed to validate prescription'
    };
  }
}

class OrderController {

  // ======================================================
  // ✅ CREATE ORDER - UPDATED WITH PRESCRIPTION VALIDATION
  // ======================================================
  async createOrder(req, res) {
    try {
      const userId = req.user.id;
      const {
        items,
        addressId,
        paymentMethod = 'CASH',
        shippingCost = 0,
        shippingMethod = 'STANDARD',
        subtotal,
        totalAmount,
        status = 'PENDING',
        prescriptionId,
        // ====== DELIVERY INSTRUCTIONS ======
        deliveryInstructions = '',
        phoneNumber = '',
        notes = ''
        // ===================================
      } = req.body;

      console.log('🛒 Creating order for user:', userId);
      console.log('📦 Items count:', items?.length || 0);
      console.log('💳 Payment method:', paymentMethod);
      console.log('💊 Prescription ID:', prescriptionId);

      // Validation
      if (!items || items.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Order items are required' 
        });
      }

      if (!addressId) {
        return res.status(400).json({ 
          success: false,
          error: 'Address ID is required' 
        });
      }

      // Validate delivery instructions length
      if (deliveryInstructions && deliveryInstructions.length > 500) {
        return res.status(400).json({ 
          success: false,
          error: 'Delivery instructions too long. Maximum 500 characters.' 
        });
      }

      // Validate items and check prescription requirements
      const productIds = items.map(item => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          prescriptionRequired: true,
          inStock: true,
          price: true
        }
      });

      // Check if all products exist
      if (products.length !== items.length) {
        const foundIds = products.map(p => p.id);
        const missingIds = productIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          success: false,
          error: 'Some products not found',
          missingProducts: missingIds
        });
      }

      // Check stock availability
      const outOfStockItems = items.filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && !product.inStock;
      });

      if (outOfStockItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Some products are out of stock',
          outOfStockItems: outOfStockItems.map(item => ({
            productId: item.productId,
            productName: products.find(p => p.id === item.productId)?.name
          }))
        });
      }

      // Validate prescription status
      const prescriptionValidation = await validatePrescriptionStatus(userId, items);
      
      if (!prescriptionValidation.valid) {
        return res.status(400).json({
          success: false,
          error: prescriptionValidation.message || 'Prescription validation failed',
          requiresPrescription: prescriptionValidation.requiresPrescription,
          prescriptionStatus: prescriptionValidation.prescriptionStatus,
          prescriptionItems: prescriptionValidation.prescriptionItems,
          suggestion: 'Please upload and get your prescription approved before placing an order'
        });
      }

      // If prescription is required, validate prescriptionId
      if (prescriptionValidation.requiresPrescription) {
        if (!prescriptionId) {
          return res.status(400).json({
            success: false,
            error: 'Prescription ID is required for prescription medications',
            requiresPrescription: true,
            prescriptionStatus: 'MISSING'
          });
        }

        // Verify prescription belongs to user and is approved
        const prescription = await prisma.prescription.findFirst({
          where: {
            id: prescriptionId,
            userId,
            status: 'APPROVED'
          }
        });

        if (!prescription) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or unapproved prescription',
            requiresPrescription: true,
            prescriptionStatus: 'INVALID'
          });
        }
      }

      const orderNumber = generateOrderNumber();

      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }));

      // Set payment status
      let paymentStatus = 'PENDING';
      if (paymentMethod === 'CASH') {
        paymentStatus = 'UNPAID';
      }

      // Get user phone if not provided
      let contactPhone = phoneNumber;
      if (!contactPhone) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { phone: true }
        });
        contactPhone = user?.phone || '';
      }

      // --- CREATE ORDER WITH PRESCRIPTION ---
      const orderData = {
        orderNumber,
        userId,
        addressId,
        paymentMethod,
        shippingCost: Number(shippingCost),
        shippingMethod,
        subtotal: Number(subtotal),
        totalAmount: Number(totalAmount),
        status,
        paymentStatus,
        // ====== DELIVERY INSTRUCTIONS ======
        deliveryInstructions: deliveryInstructions?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        // ====== PRESCRIPTION ======
        ...(prescriptionId && { prescriptionId }),
        // ===================================
        items: {
          create: orderItems
        }
      };

      const order = await prisma.order.create({
        data: orderData,
        include: {
          items: { 
            include: { 
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  prescriptionRequired: true,
                  category: true,
                  brand: true
                }
              } 
            } 
          },
          address: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          prescription: prescriptionId ? {
            select: {
              id: true,
              status: true,
              image: true,
              createdAt: true
            }
          } : false
        }
      });

      console.log('✅ Order created:', {
        id: order.id,
        orderNumber: order.orderNumber,
        prescriptionId: order.prescriptionId,
        hasPrescription: !!order.prescriptionId,
        prescriptionStatus: order.prescription?.status
      });

      // --- SEND NOTIFICATIONS ---    
      console.log('📨 Sending order confirmation notification...');
      try {
        await NotificationService.sendOrderConfirmed(userId, order);
        console.log('✅ Order confirmation notification sent');
      } catch (notifError) {
        console.error('❌ Failed to send order confirmation:', notifError);
      }

      console.log('📨 Sending admin notification...');
      try {
        await NotificationService.sendNewOrderAdmin(order);
        console.log('✅ Admin notification sent');
      } catch (notifError) {
        console.error('❌ Failed to send admin notification:', notifError);
      }

      // Special notification for prescription orders
      if (order.prescriptionId) {
        console.log('💊 Prescription order - sending special notification');
        try {
          await prisma.notification.create({
            data: {
              userId: userId,
              type: 'PRESCRIPTION_ORDER',
              title: 'Prescription Order Placed',
              message: `Order #${order.orderNumber} contains prescription medications`,
              data: JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                hasPrescription: true,
                prescriptionId: order.prescriptionId,
                prescriptionStatus: order.prescription?.status
              })
            }
          });
          console.log('✅ Prescription order notification created');
        } catch (notifError) {
          console.error('❌ Failed to create prescription order notification:', notifError);
        }
      }

      // Include delivery instructions in admin notification
      if (order.deliveryInstructions) {
        console.log('📝 Order has delivery instructions - notifying admin team');
        try {
          await prisma.notification.create({
            data: {
              userId: userId,
              type: 'DELIVERY_INSTRUCTIONS',
              title: 'Order with Delivery Instructions',
              message: `Order #${order.orderNumber} has delivery instructions for delivery team`,
              data: JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                deliveryInstructions: order.deliveryInstructions.substring(0, 100) + '...',
                hasDeliveryInstructions: true
              })
            }
          });
          console.log('✅ Delivery instructions notification created');
        } catch (notifError) {
          console.error('❌ Failed to create delivery instructions notification:', notifError);
        }
      }

      // --- CLEAR USER CART ---
      await prisma.cartItem.deleteMany({
        where: { cart: { userId } }
      });

      console.log('🛍️ Cart cleared for user:', userId);

      // Prepare response
      const response = {
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          shippingMethod: order.shippingMethod,
          // ====== DELIVERY INSTRUCTIONS ======
          deliveryInstructions: order.deliveryInstructions,
          contactPhone: order.contactPhone,
          // ====== PRESCRIPTION INFO ======
          prescriptionId: order.prescriptionId,
          prescriptionStatus: order.prescription?.status,
          hasPrescription: !!order.prescriptionId,
          requiresPrescription: prescriptionValidation.requiresPrescription,
          // ===================================
          address: order.address,
          items: order.items.map(item => ({
            ...item,
            product: {
              ...item.product,
              prescriptionRequired: item.product.prescriptionRequired
            }
          })),
          createdAt: order.createdAt
        },
        message: paymentMethod === 'MPESA' 
          ? 'Order created. Please complete MPESA payment.' 
          : 'Order created successfully. Pay on delivery.'
      };

      if (prescriptionValidation.requiresPrescription) {
        response.prescriptionInfo = {
          validated: true,
          status: prescriptionValidation.prescriptionStatus,
          message: 'Prescription validated successfully'
        };
      }

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Create order error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create order',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ======================================================
  // ✅ GET USER ORDERS - UPDATED WITH PRESCRIPTION INFO
  // ======================================================
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { status, paymentStatus, hasPrescription, page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { userId };
      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (hasPrescription === 'true') {
        where.prescriptionId = { not: null };
      } else if (hasPrescription === 'false') {
        where.prescriptionId = null;
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: { 
              include: { 
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    prescriptionRequired: true,
                    category: true,
                    brand: true
                  }
                } 
              } 
            },
            address: true,
            prescription: {
              select: {
                id: true,
                status: true,
                image: true,
                createdAt: true
              }
            }
          }
        }),
        prisma.order.count({ where })
      ]);

      // Format orders
      const formattedOrders = orders.map(order => {
        // Check if order has prescription drugs
        const hasPrescriptionDrugs = order.items.some(item => 
          item.product.prescriptionRequired
        );

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          shippingMethod: order.shippingMethod,
          // ====== DELIVERY INSTRUCTIONS ======
          deliveryInstructions: order.deliveryInstructions,
          contactPhone: order.contactPhone,
          hasDeliveryInstructions: !!order.deliveryInstructions,
          // ====== PRESCRIPTION INFO ======
          prescriptionId: order.prescriptionId,
          prescriptionStatus: order.prescription?.status,
          hasPrescription: !!order.prescriptionId,
          hasPrescriptionDrugs,
          // ===================================
          address: order.address,
          items: order.items.map(item => ({
            id: item.id,
            product: {
              ...item.product,
              prescriptionRequired: item.product.prescriptionRequired
            },
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          })),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      });

      return res.json({
        success: true,
        orders: formattedOrders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get user orders error:', error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch orders" 
      });
    }
  }

  // ======================================================
  // ✅ GET SINGLE ORDER - UPDATED WITH PRESCRIPTION INFO
  // ======================================================
  async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { 
            include: { 
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  prescriptionRequired: true,
                  category: true,
                  brand: true
                }
              } 
            } 
          },
          address: true,
          prescription: {
            select: {
              id: true,
              status: true,
              image: true,
              approvedBy: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });

      if (!order) return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
      
      if (order.userId !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized" 
        });
      }

      // Check if order has prescription drugs
      const hasPrescriptionDrugs = order.items.some(item => 
        item.product.prescriptionRequired
      );

      // Format order
      const formattedOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        shippingMethod: order.shippingMethod,
        // ====== DELIVERY INSTRUCTIONS ======
        deliveryInstructions: order.deliveryInstructions,
        contactPhone: order.contactPhone,
        hasDeliveryInstructions: !!order.deliveryInstructions,
        // ====== PRESCRIPTION INFO ======
        prescriptionId: order.prescriptionId,
        prescriptionStatus: order.prescription?.status,
        prescription: order.prescription,
        hasPrescription: !!order.prescriptionId,
        hasPrescriptionDrugs,
        requiresPrescriptionApproval: hasPrescriptionDrugs && !order.prescriptionId,
        // ===================================
        address: order.address,
        items: order.items.map(item => ({
          id: item.id,
          product: {
            ...item.product,
            prescriptionRequired: item.product.prescriptionRequired
          },
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };

      return res.json({ 
        success: true, 
        order: formattedOrder 
      });

    } catch (error) {
      console.error('Get order error:', error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch order" 
      });
    }
  }

  // ======================================================
  // ✅ INITIATE PAYMENT - UPDATED WITH PRESCRIPTION CHECK
  // ======================================================
  async initiatePayment(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { phoneNumber, paymentMethod = "MPESA" } = req.body;

      const order = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: { 
          user: true,
          items: {
            include: {
              product: {
                select: {
                  prescriptionRequired: true
                }
              }
            }
          },
          prescription: {
            select: {
              status: true
            }
          }
        }
      });
      
      if (!order) return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
      
      if (order.userId !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized" 
        });
      }
      
      if (order.paymentStatus === "PAID") {
        return res.status(400).json({ 
          success: false, 
          error: "Order is already paid" 
        });
      }

      // Check if order has prescription drugs requiring approval
      const hasPrescriptionDrugs = order.items.some(item => 
        item.product.prescriptionRequired
      );

      if (hasPrescriptionDrugs) {
        if (!order.prescriptionId) {
          return res.status(400).json({
            success: false,
            error: 'Prescription required before payment',
            requiresPrescription: true,
            prescriptionStatus: 'MISSING'
          });
        }

        if (order.prescription.status !== 'APPROVED') {
          return res.status(400).json({
            success: false,
            error: 'Prescription not approved',
            requiresPrescription: true,
            prescriptionStatus: order.prescription.status
          });
        }
      }

      let paymentResponse = null;
      let paymentInitiated = false;

      // --------- MPESA ----------
      if (paymentMethod === "MPESA") {
        if (!phoneNumber) {
          return res.status(400).json({ 
            success: false, 
            error: "Phone number is required for MPESA" 
          });
        }

        paymentResponse = await mpesaService.initiateSTKPush({
          phoneNumber,
          amount: order.totalAmount,
          orderId: order.id,
          accountReference: order.orderNumber,
          transactionDesc: `Payment for Order #${order.orderNumber}`,
          userId
        });

        if (paymentResponse.success) {
          paymentInitiated = true;
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentMethod: "MPESA",
              paymentStatus: "PENDING",
              contactPhone: phoneNumber // Update contact phone with payment phone
            }
          });
        }
      }

      // --------- CASH ----------
      else if (paymentMethod === "CASH") {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentMethod: "CASH",
            paymentStatus: "UNPAID"
          }
        });
        paymentResponse = { 
          success: true, 
          message: "Order updated for cash payment" 
        };
      }

      return res.json({
        success: true,
        message: paymentInitiated
          ? "Payment initiated. Check your phone for MPESA prompt."
          : "Payment method updated.",
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          paymentStatus: paymentMethod === "MPESA" ? "PENDING" : "UNPAID",
          paymentMethod,
          // Include delivery instructions in response
          deliveryInstructions: order.deliveryInstructions,
          contactPhone: order.contactPhone,
          // Include prescription info
          hasPrescription: !!order.prescriptionId,
          prescriptionStatus: order.prescription?.status
        },
        paymentInitiated,
        paymentResponse
      });

    } catch (error) {
      console.error("Initiate payment error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to initiate payment" 
      });
    }
  }

  // ======================================================
  // ✅ CHECK PAYMENT STATUS - IMPROVED VERSION
  // ======================================================
  async checkPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: {
          items: { 
            include: { 
              product: {
                select: {
                  id: true,
                  name: true,
                  prescriptionRequired: true
                }
              } 
            } 
          },
          address: true,
          prescription: {
            select: {
              status: true
            }
          }
        }
      });
      
      if (!order) return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
      
      if (order.userId !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized" 
        });
      }

      console.log(`🔍 Checking payment status for ${order.orderNumber}:`, {
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        hasPrescription: !!order.prescriptionId,
        prescriptionStatus: order.prescription?.status
      });

      // Check if order has prescription drugs
      const hasPrescriptionDrugs = order.items.some(item => 
        item.product.prescriptionRequired
      );

      // Determine if payment is needed
      let needsPayment = false;
      let canPay = true;
      let prescriptionMessage = '';

      if (hasPrescriptionDrugs) {
        if (!order.prescriptionId) {
          canPay = false;
          prescriptionMessage = 'Prescription required before payment';
        } else if (order.prescription.status !== 'APPROVED') {
          canPay = false;
          prescriptionMessage = `Prescription ${order.prescription.status.toLowerCase()}`;
        }
      }

      if (order.paymentMethod === 'MPESA') {
        needsPayment = order.paymentStatus === 'PENDING' && canPay;
      } else if (order.paymentMethod === 'CASH') {
        needsPayment = order.paymentStatus === 'UNPAID' && canPay;
      }

      return res.json({ 
        success: true, 
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          shippingMethod: order.shippingMethod,
          // ====== DELIVERY INSTRUCTIONS ======
          deliveryInstructions: order.deliveryInstructions,
          contactPhone: order.contactPhone,
          hasDeliveryInstructions: !!order.deliveryInstructions,
          // ====== PRESCRIPTION INFO ======
          hasPrescriptionDrugs,
          prescriptionId: order.prescriptionId,
          prescriptionStatus: order.prescription?.status,
          hasPrescription: !!order.prescriptionId,
          canPay,
          prescriptionMessage,
          // ===================================
          address: order.address,
          items: order.items,
          createdAt: order.createdAt
        },
        needsPayment,
        isPaid: order.paymentStatus === 'PAID',
        isFailed: order.paymentStatus === 'FAILED'
      });

    } catch (error) {
      console.error("Check payment status error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to check payment status" 
      });
    }
  }

  // ======================================================
  // ✅ UPDATE PAYMENT STATUS
  // ======================================================
  async updatePaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { paymentStatus, mpesaReceiptNumber, transactionId } = req.body;

      console.log(`🔄 Updating payment status for order ${orderId}:`, {
        paymentStatus,
        mpesaReceiptNumber,
        transactionId
      });

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          user: true,
          prescription: {
            select: {
              status: true
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: "Order not found" 
        });
      }

      // Verify user owns this order
      if (order.userId !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized" 
        });
      }

      // Update order
      const updateData = {
        paymentStatus,
        ...(mpesaReceiptNumber && { mpesaReceiptNumber }),
        ...(transactionId && { mpesaTransactionId: transactionId }),
        ...(paymentStatus === 'PAID' && { 
          paidAt: new Date(),
          status: 'CONFIRMED' // Move to confirmed when paid
        })
      };

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: { 
            include: { 
              product: {
                select: {
                  id: true,
                  name: true,
                  prescriptionRequired: true
                }
              } 
            } 
          },
          address: true
        }
      });

      console.log(`✅ Order ${order.orderNumber} payment status updated to: ${paymentStatus}`);
      console.log(`💊 Order prescription status: ${order.prescription?.status}`);

      // Send notifications if payment successful
      if (paymentStatus === 'PAID') {
        try {
          await NotificationService.sendPaymentSuccess(userId, updatedOrder);
          console.log('📨 Payment success notification sent');
        } catch (notifError) {
          console.error('❌ Failed to send payment notification:', notifError);
        }
      }

      return res.json({
        success: true,
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          paymentMethod: updatedOrder.paymentMethod,
          totalAmount: updatedOrder.totalAmount,
          // ====== DELIVERY INSTRUCTIONS ======
          deliveryInstructions: updatedOrder.deliveryInstructions,
          contactPhone: updatedOrder.contactPhone,
          hasDeliveryInstructions: !!updatedOrder.deliveryInstructions,
          // ====== PRESCRIPTION INFO ======
          prescriptionId: order.prescriptionId,
          prescriptionStatus: order.prescription?.status,
          hasPrescription: !!order.prescriptionId,
          // ===================================
          address: updatedOrder.address,
          items: updatedOrder.items,
          createdAt: updatedOrder.createdAt
        },
        message: `Payment status updated to ${paymentStatus}`
      });

    } catch (error) {
      console.error("Update payment status error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to update payment status" 
      });
    }
  }

  // ======================================================
  // ✅ UPDATE DELIVERY INSTRUCTIONS
  // ======================================================
  async updateDeliveryInstructions(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { deliveryInstructions } = req.body;

      console.log(`📝 Updating delivery instructions for order ${orderId}:`, {
        userId,
        instructionsLength: deliveryInstructions?.length || 0
      });

      // Validate length
      if (deliveryInstructions && deliveryInstructions.length > 500) {
        return res.status(400).json({ 
          success: false, 
          error: 'Delivery instructions too long. Maximum 500 characters.' 
        });
      }

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: "Order not found" 
        });
      }

      // Verify user owns this order
      if (order.userId !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized" 
        });
      }

      // Can't update if order is already shipped or delivered
      if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({ 
          success: false, 
          error: `Cannot update delivery instructions for order with status: ${order.status}` 
        });
      }

      // Update delivery instructions
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryInstructions: deliveryInstructions?.trim() || null
        },
        include: {
          address: true,
          items: { 
            include: { 
              product: {
                select: {
                  id: true,
                  name: true,
                  prescriptionRequired: true
                }
              } 
            } 
          }
        }
      });

      console.log(`✅ Delivery instructions updated for order ${order.orderNumber}`);

      // Create notification for admin
      if (deliveryInstructions) {
        try {
          await prisma.notification.create({
            data: {
              userId: userId,
              type: 'DELIVERY_INSTRUCTIONS_UPDATED',
              title: 'Delivery Instructions Updated',
              message: `Delivery instructions updated for Order #${order.orderNumber}`,
              data: JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                deliveryInstructions: deliveryInstructions.substring(0, 100) + '...',
                updatedBy: userId
              })
            }
          });
          console.log('✅ Delivery instructions update notification created');
        } catch (notifError) {
          console.error('❌ Failed to create update notification:', notifError);
        }
      }

      return res.json({
        success: true,
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          deliveryInstructions: updatedOrder.deliveryInstructions,
          hasDeliveryInstructions: !!updatedOrder.deliveryInstructions,
          updatedAt: updatedOrder.updatedAt
        },
        message: deliveryInstructions 
          ? 'Delivery instructions updated successfully' 
          : 'Delivery instructions cleared'
      });

    } catch (error) {
      console.error("Update delivery instructions error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to update delivery instructions" 
      });
    }
  }

  // ======================================================
  // ✅ ATTACH PRESCRIPTION TO ORDER (NEW)
  // ======================================================
  async attachPrescription(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { prescriptionId } = req.body;

      console.log(`💊 Attaching prescription to order ${orderId}:`, {
        userId,
        prescriptionId
      });

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  prescriptionRequired: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: "Order not found" 
        });
      }

      // Verify user owns this order
      if (order.userId !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized" 
        });
      }

      // Check if order has prescription drugs
      const hasPrescriptionDrugs = order.items.some(item => 
        item.product.prescriptionRequired
      );

      if (!hasPrescriptionDrugs) {
        return res.status(400).json({
          success: false,
          error: 'Order does not contain prescription medications',
          requiresPrescription: false
        });
      }

      // Verify prescription belongs to user and is approved
      const prescription = await prisma.prescription.findFirst({
        where: {
          id: prescriptionId,
          userId,
          status: 'APPROVED'
        }
      });

      if (!prescription) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or unapproved prescription',
          requiresPrescription: true,
          prescriptionStatus: 'INVALID'
        });
      }

      // Update order with prescription
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          prescriptionId,
          status: order.status === 'PENDING' ? 'PROCESSING' : order.status
        },
        include: {
          prescription: {
            select: {
              id: true,
              status: true,
              image: true,
              createdAt: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        }
      });

      console.log(`✅ Prescription attached to order ${order.orderNumber}`);

      return res.json({
        success: true,
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          prescriptionId: updatedOrder.prescriptionId,
          prescriptionStatus: updatedOrder.prescription?.status,
          status: updatedOrder.status,
          hasPrescription: true
        },
        message: 'Prescription attached successfully'
      });

    } catch (error) {
      console.error("Attach prescription error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to attach prescription" 
      });
    }
  }

  // ======================================================
  // ✅ VALIDATE ORDER FOR CHECKOUT (NEW)
  // ======================================================
  async validateForCheckout(req, res) {
    try {
      const userId = req.user.id;
      const { items } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No items provided for validation' 
        });
      }

      // Get product details
      const productIds = items.map(item => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          prescriptionRequired: true,
          inStock: true,
          price: true
        }
      });

      // Check product existence
      if (products.length !== items.length) {
        const foundIds = products.map(p => p.id);
        const missingIds = productIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          success: false,
          error: 'Some products not found',
          missingProducts: missingIds
        });
      }

      // Check stock availability
      const outOfStockItems = items.filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && !product.inStock;
      });

      if (outOfStockItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Some products are out of stock',
          outOfStockItems: outOfStockItems.map(item => ({
            productId: item.productId,
            productName: products.find(p => p.id === item.productId)?.name
          }))
        });
      }

      // Validate prescription status
      const prescriptionValidation = await validatePrescriptionStatus(userId, items);

      // Get user's approved prescriptions
      const approvedPrescriptions = await prisma.prescription.findMany({
        where: {
          userId,
          status: 'APPROVED'
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      });

      return res.json({
        success: true,
        validation: {
          allProductsExist: true,
          allInStock: outOfStockItems.length === 0,
          requiresPrescription: prescriptionValidation.requiresPrescription,
          prescriptionValid: prescriptionValidation.valid,
          prescriptionStatus: prescriptionValidation.prescriptionStatus,
          approvedPrescriptions: approvedPrescriptions,
          prescriptionItems: prescriptionValidation.prescriptionItems
        },
        canProceed: prescriptionValidation.valid,
        message: prescriptionValidation.valid 
          ? 'Order validation successful'
          : prescriptionValidation.message
      });

    } catch (error) {
      console.error("Validate for checkout error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to validate order" 
      });
    }
  }
}

module.exports = new OrderController();