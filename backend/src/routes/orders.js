// backend/src/routes/orders.js - CUSTOMER ROUTES ONLY
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ======================================================
// ✅ DEBUG ROUTE - Add this first for testing
// ======================================================
router.get('/debug-auth', authenticate, (req, res) => {
  console.log('🔍 DEBUG - Full req.user:', req.user);
  console.log('🔍 DEBUG - req.user keys:', Object.keys(req.user || {}));
  console.log('🔍 DEBUG - req.user.id:', req.user?.id);
  console.log('🔍 DEBUG - req.user.userId:', req.user?.userId);
  
  res.json({
    success: true,
    user: req.user,
    userId: req.user?.userId,
    id: req.user?.id,
    message: 'Auth debug information'
  });
});

// ======================================================
// ✅ CUSTOMER ROUTES ONLY (No admin routes here)
// ======================================================

// GET /api/orders - Get all orders for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // Use req.user.id (from auth middleware)
    
    console.log('📦 Getting orders for user ID:', userId);
    
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      deliveryInstructions: order.deliveryInstructions,
      items: order.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images ? JSON.parse(item.product.images)[0] : null,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress: order.address ? {
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders
      }
    });

  } catch (error) {
    console.error('❌ Get user orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// GET /api/orders/:orderId - Get single order for logged-in user
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    console.log('📦 Getting order:', orderId, 'for user:', userId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                price: true,
                brand: {
                  select: {
                    name: true
                  }
                },
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

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
      deliveryInstructions: order.deliveryInstructions,
      contactPhone: order.contactPhone,
      items: order.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productDescription: item.product.description,
        productImage: item.product.images ? JSON.parse(item.product.images)[0] : null,
        brand: item.product.brand?.name,
        category: item.product.category?.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      shippingAddress: order.address ? {
        id: order.address.id,
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode,
        country: order.address.country,
        isDefault: order.address.isDefault
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };

    res.json({
      success: true,
      data: {
        order: formattedOrder
      }
    });

  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// POST /api/orders - Create new order with delivery instructionss
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('🛒 POST /api/orders - Creating order');
    console.log('👤 Full req.user object:', req.user);
    console.log('🔐 req.user.id:', req.user?.id);
    
    // Use req.user.id (from Prisma user object)
    const userId = req.user.id;
    
    console.log('👤 Using userId:', userId);
    console.log('📦 Request body:', req.body);
    
    const {
      addressId,
      paymentMethod = 'CASH', // Default to CASH
      deliveryInstructions = '',
      contactPhone = '',
      phoneNumber = '', // Alternative field name
      shippingCost = 150, // Add shipping cost from frontend
      subtotal = 0
    } = req.body;

    // Validate required fields
    if (!addressId) {
      return res.status(400).json({
        success: false,
        error: 'Shipping address is required'
      });
    }

    // Get user's cart with items
    console.log('🛒 Getting cart for user:', userId);
    
    // First check if user has a cart
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                price: true,
                inStock: true,  // ✅ Changed from stock
                name: true,
                salePrice: true  // Add salePrice if needed
              }
            }
          }
        }
      }
    });

    // If no cart exists, create one
    if (!cart) {
      console.log('🛒 No cart found, creating new cart');
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: true
        }
      });
    }

    console.log('🛒 Cart found:', {
      cartId: cart.id,
      itemCount: cart.items.length,
      items: cart.items.map(i => ({
        productId: i.productId,
        productName: i.product?.name,
        quantity: i.quantity,
        price: i.price
      }))
    });

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Get address
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address not found'
      });
    }

    // Calculate totals and validate items
    let calculatedSubtotal = 0;
    const orderItems = [];

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      
      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Product not found for cart item ${cartItem.id}`
        });
      }

      // Check if product is in stock
      if (!product.inStock) {  // ✅ Changed from stock check
        return res.status(400).json({
          success: false,
          error: `${product.name} is currently out of stock. Please remove it from your cart to continue.`
        });
      }

      // Use salePrice if available, otherwise use regular price
      const price = product.salePrice || product.price;
      const itemTotal = price * cartItem.quantity;
      calculatedSubtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: cartItem.quantity,
        price: price
      });
    }

    // Use provided subtotal or calculated one
    const finalSubtotal = subtotal > 0 ? subtotal : calculatedSubtotal;
    const finalShippingCost = shippingCost || 150;
    const totalAmount = finalSubtotal + finalShippingCost;

    // Generate order number
    const orderNumber = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);

    console.log('💰 Order calculations:', {
      finalSubtotal,
      finalShippingCost,
      totalAmount,
      itemCount: orderItems.length,
      paymentMethod,
      deliveryInstructionsLength: deliveryInstructions?.length || 0
    });

    // Create order with transaction
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        console.log('🏦 Starting transaction for order:', orderNumber);
        
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            addressId,
            paymentMethod: paymentMethod === 'CASH' ? 'CASH_ON_DELIVERY' : paymentMethod,
            paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
            status: 'PENDING',
            subtotal: finalSubtotal,
            shippingCost: finalShippingCost,
            totalAmount,
            deliveryInstructions: deliveryInstructions || null,
            contactPhone: contactPhone || phoneNumber || req.user.phone || null,
            items: {
              create: orderItems
            }
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    price: true
                  }
                }
              }
            },
            address: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        console.log('✅ Order created in database:', newOrder.id);

        // For now, skip stock update since we don't have stock field
        // Just update inStock to false if needed in the future
        // Update: Set products to out of stock after purchase if needed
        for (const item of orderItems) {
          // You could set inStock to false here if you want
          // await tx.product.update({
          //   where: { id: item.productId },
          //   data: { inStock: false }
          // });
        }

        // Clear the cart
        console.log('🛒 Clearing cart for user:', userId);
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id
          }
        });

        return newOrder;
      });

      console.log('🎉 Order transaction completed:', order.id);

    } catch (transactionError) {
      console.error('❌ Transaction failed:', transactionError);
      throw transactionError;
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      deliveryInstructions: order.deliveryInstructions,
      contactPhone: order.contactPhone,
      items: order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      shippingAddress: order.address ? {
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode
      } : null,
      createdAt: order.createdAt
    };

    console.log('📤 Sending success response for order:', order.orderNumber);

    res.status(201).json({
      success: true,
      data: {
        order: formattedOrder
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create order: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PATCH /api/orders/:orderId/delivery-instructions - Update delivery instructions
router.patch('/:orderId/delivery-instructions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { deliveryInstructions } = req.body;

    console.log('📝 Updating delivery instructions for order:', orderId);

    // Check if order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Only allow updates for pending orders
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update instructions for this order status'
      });
    }

    // Update delivery instructions
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { deliveryInstructions: deliveryInstructions || null },
      select: {
        id: true,
        orderNumber: true,
        deliveryInstructions: true,
        status: true,
        updatedAt: true
      }
    });

    console.log('✅ Delivery instructions updated for order:', order.orderNumber);

    res.json({
      success: true,
      data: {
        order: updatedOrder
      },
      message: 'Delivery instructions updated successfully'
    });

  } catch (error) {
    console.error('❌ Update delivery instructions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery instructions'
    });
  }
});

// POST /api/orders/:orderId/cancel - Cancel order
router.post('/:orderId/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    console.log('❌ Cancelling order:', orderId, 'for user:', userId);

    // Check if order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Only allow cancellation for pending/confirmed orders
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel order at this stage'
      });
    }

    // Update order status and restore stock
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const orderUpdate = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      // Restore product stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
      }

      return orderUpdate;
    });

    console.log('✅ Order cancelled:', order.orderNumber);

    res.json({
      success: true,
      data: {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          updatedAt: updatedOrder.updatedAt
        }
      },
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
});

// POST /api/orders/:orderId/payment - Initiate payment
router.post('/:orderId/payment', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { paymentMethod, mpesaPhone } = req.body;

    console.log('💳 Initiating payment for order:', orderId);

    // Check if order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update payment method if provided
    let updateData = {};
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    if (mpesaPhone) {
      updateData.contactPhone = mpesaPhone;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: updateData
      });
    }

    console.log('✅ Payment initiated for order:', order.orderNumber);

    res.json({
      success: true,
      data: {
        orderId,
        paymentMethod: paymentMethod || order.paymentMethod,
        status: 'PENDING',
        message: 'Payment initiated successfully'
      }
    });

  } catch (error) {
    console.error('❌ Payment initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate payment'
    });
  }
});

// GET /api/orders/:orderId/payment/status - Check payment status
router.get('/:orderId/payment/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    console.log('🔍 Checking payment status for order:', orderId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    console.log('✅ Payment status for order', order.orderNumber, 'is:', order.paymentStatus);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        amount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('❌ Payment status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status'
    });
  }
});

module.exports = router;