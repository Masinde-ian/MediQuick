// backend/src/routes/adminOrders.js - ADMIN ORDER ROUTES ONLY
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ======================================================
// ✅ ADMIN ORDER ROUTES ONLY
// ======================================================

// GET /api/admin/orders - Get all orders with filters
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      hasInstructions,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filters
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Delivery instructions filter
    if (hasInstructions === 'true') {
      where.deliveryInstructions = { not: null };
    } else if (hasInstructions === 'false') {
      where.deliveryInstructions = null;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        { deliveryInstructions: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get orders with all details
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc'
      },
      skip,
      take: parseInt(limit)
    });

    const total = await prisma.order.count({ where });

    // Format orders to highlight delivery instructions
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone
      },
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
      // ===================================
      address: {
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode,
        country: order.address.country
      },
      items: order.items.map(item => ({
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// GET /api/admin/orders/:orderId - Get order details
router.get('/orders/:orderId', adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                images: true,
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

    // Format order with highlighted delivery information for admin
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone
      },
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      shippingMethod: order.shippingMethod,
      // ====== DELIVERY INFORMATION ======
      deliveryInstructions: order.deliveryInstructions,
      contactPhone: order.contactPhone || order.user.phone,
      // ==================================
      address: {
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode,
        country: order.address.country,
        isDefault: order.address.isDefault
      },
      items: order.items.map(item => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          price: item.product.price,
          image: item.product.images ? JSON.parse(item.product.images)[0] : null,
          brand: item.product.brand?.name,
          category: item.product.category?.name
        },
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
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
    console.error('Admin get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// PATCH /api/admin/orders/:orderId - Update order status
router.patch('/orders/:orderId', adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus, deliveryInstructions } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (deliveryInstructions !== undefined) updateData.deliveryInstructions = deliveryInstructions;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          deliveryInstructions: order.deliveryInstructions,
          updatedAt: order.updatedAt
        }
      },
      message: 'Order updated successfully'
    });

  } catch (error) {
    console.error('Admin update order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order'
    });
  }
});

// GET /api/admin/orders/stats - Get order statistics
router.get('/orders/stats', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      todaysOrders,
      monthlyOrders,
      ordersWithDeliveryInstructions,
      totalCustomers,
      lowStockProducts
    ] = await Promise.all([
      // Total orders
      prisma.order.count(),
      
      // Total revenue (only PAID orders)
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { totalAmount: true }
      }),
      
      // Pending orders
      prisma.order.count({
        where: { 
          OR: [
            { status: 'PENDING' },
            { status: 'PROCESSING' }
          ]
        }
      }),
      
      // Today's orders
      prisma.order.count({
        where: { createdAt: { gte: startOfDay } }
      }),
      
      // This month's orders
      prisma.order.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      
      // Orders with delivery instructions
      prisma.order.count({
        where: { deliveryInstructions: { not: null } }
      }),
      
      // Total customers
      prisma.user.count({
        where: { role: 'USER' }
      }),
      
      // Low stock products (stock < 10)
      prisma.product.count({
        where: { stock: { lt: 10 } }
      })
    ]);

    // Revenue for last 30 days
    const recentRevenue = await prisma.order.aggregate({
      where: { 
        paymentStatus: 'PAID',
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { totalAmount: true }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          pendingOrders,
          todaysOrders,
          monthlyOrders,
          recentRevenue: recentRevenue._sum.totalAmount || 0,
          ordersWithDeliveryInstructions,
          percentageWithInstructions: totalOrders > 0 
            ? Math.round((ordersWithDeliveryInstructions / totalOrders) * 100) 
            : 0,
          totalCustomers,
          lowStockProducts,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/admin/orders/recent - Get recent orders for dashboard
router.get('/orders/recent', adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentOrders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          },
          take: 2
        }
      }
    });

    // Format for dashboard
    const formattedOrders = recentOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      hasDeliveryInstructions: !!order.deliveryInstructions,
      deliveryInstructions: order.deliveryInstructions,
      items: order.items.map(item => item.product.name).join(', '),
      createdAt: order.createdAt,
      isNew: order.status === 'PENDING' || order.status === 'CONFIRMED'
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        total: recentOrders.length
      }
    });

  } catch (error) {
    console.error('Admin recent orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent orders'
    });
  }
});

// GET /api/admin/orders/with-instructions - Get orders with delivery instructions
router.get('/orders/with-instructions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await prisma.order.findMany({
      where: { deliveryInstructions: { not: null } },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        address: true
      }
    });

    const total = await prisma.order.count({
      where: { deliveryInstructions: { not: null } }
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      customerPhone: order.contactPhone || order.user.phone,
      status: order.status,
      deliveryInstructions: order.deliveryInstructions,
      address: `${order.address.street}, ${order.address.city}`,
      instructionsLength: order.deliveryInstructions.length,
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Admin orders with instructions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders with instructions'
    });
  }
});

// PATCH /api/admin/orders/:orderId/delivery-instructions - Update delivery instructions
router.patch('/orders/:orderId/delivery-instructions', adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryInstructions } = req.body;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { deliveryInstructions },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryInstructions: order.deliveryInstructions,
          updatedAt: order.updatedAt
        }
      },
      message: 'Delivery instructions updated successfully'
    });

  } catch (error) {
    console.error('Admin update delivery instructions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery instructions'
    });
  }
});

// GET /api/admin/orders/search - Search orders
router.get('/orders/search', adminAuth, async (req, res) => {
  try {
    const { q: searchTerm } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          },
          { deliveryInstructions: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      hasDeliveryInstructions: !!order.deliveryInstructions,
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        total: orders.length
      }
    });

  } catch (error) {
    console.error('Admin search orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search orders'
    });
  }
});

module.exports = router;