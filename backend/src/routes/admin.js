const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');

const prisma = new PrismaClient();

// Admin Dashboard Analytics
router.get('/analytics/dashboard', adminAuth, async (req, res) => {
  try {
    // Get total orders count
    const totalOrders = await prisma.order.count();
    
    // Get total revenue from delivered orders
    const revenueResult = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        status: 'DELIVERED'
      }
    });
    
    // Get total products
    const totalProducts = await prisma.product.count();
    
    // Get total customers (users with role CUSTOMER)
    const totalCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER'
      }
    });
    
    // Get out of stock products (inStock = false)
    const outOfStockProducts = await prisma.product.count({
      where: {
        inStock: false
      }
    });
    
    // Get orders with delivery instructions
    const ordersWithInstructions = await prisma.order.count({
      where: {
        deliveryInstructions: {
          not: null
        }
      }
    });
    
    // Get recent orders for dashboard
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue: revenueResult._sum.totalAmount || 0,
          totalProducts,
          totalCustomers,
          outOfStockProducts,
          ordersWithInstructions,
          percentageWithInstructions: totalOrders > 0 ? 
            Math.round((ordersWithInstructions / totalOrders) * 100) : 0
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: error.message
    });
  }
});

// Get all products for inventory management
router.get('/inventory/products', adminAuth, async (req, res) => {
  try {
    const { search = '', outOfStock = false } = req.query;

    let where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    if (outOfStock === 'true') {
      where = {
        ...where,
        inStock: false
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        conditions: {
          include: {
            condition: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Inventory products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});

// Get product by ID
router.get('/inventory/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        conditions: {
          include: {
            condition: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
});

// Update product with all fields
router.put('/inventory/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      price,
      salePrice,
      sku,
      inStock,
      prescriptionRequired,
      ingredients,
      usageInstructions,
      images,
      categoryId,
      brandId
    } = req.body;

    // Validate required fields
    if (!name || !slug || !price || !sku || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, slug, price, sku, categoryId'
      });
    }

    // Check if slug is unique (except for current product)
    const existingSlug = await prisma.product.findFirst({
      where: {
        slug,
        id: { not: id }
      }
    });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: 'Product with this slug already exists'
      });
    }

    // Check if SKU is unique (except for current product)
    const existingSku = await prisma.product.findFirst({
      where: {
        sku,
        id: { not: id }
      }
    });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Parse images if provided
    let parsedImages = images;
    if (images) {
      if (typeof images === 'string') {
        try {
          parsedImages = JSON.stringify(JSON.parse(images));
        } catch (error) {
          parsedImages = JSON.stringify([images]);
        }
      } else if (Array.isArray(images)) {
        parsedImages = JSON.stringify(images);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        sku,
        inStock: Boolean(inStock),
        prescriptionRequired: Boolean(prescriptionRequired),
        ingredients: ingredients || null,
        usageInstructions: usageInstructions || null,
        images: parsedImages,
        categoryId,
        brandId: brandId || null,
        updatedAt: new Date()
      },
      include: {
        brand: true,
        category: true,
        conditions: {
          include: {
            condition: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { product },
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
});

// Create product with all fields
router.post('/inventory/products', adminAuth, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      salePrice,
      sku,
      inStock = true,
      prescriptionRequired = false,
      ingredients,
      usageInstructions,
      images = '[]',
      categoryId,
      brandId
    } = req.body;

    // Validate required fields
    const requiredFields = ['name', 'slug', 'price', 'sku', 'categoryId'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Check if slug is unique
    const existingSlug = await prisma.product.findUnique({
      where: { slug }
    });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: 'Product with this slug already exists'
      });
    }

    // Check if SKU is unique
    const existingSku = await prisma.product.findUnique({
      where: { sku }
    });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Parse images
    let parsedImages = images;
    if (typeof images === 'string') {
      try {
        parsedImages = JSON.stringify(JSON.parse(images));
      } catch (error) {
        parsedImages = JSON.stringify([images]);
      }
    } else if (Array.isArray(images)) {
      parsedImages = JSON.stringify(images);
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        sku,
        inStock: Boolean(inStock),
        prescriptionRequired: Boolean(prescriptionRequired),
        ingredients: ingredients || null,
        usageInstructions: usageInstructions || null,
        images: parsedImages,
        categoryId,
        brandId: brandId || null
      },
      include: {
        brand: true,
        category: true
      }
    });

    res.status(201).json({
      success: true,
      data: { product },
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});

// Delete product
router.delete('/inventory/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
});

// Toggle product stock status
router.patch('/inventory/products/:id/stock', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { inStock } = req.body;

    if (typeof inStock !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'inStock must be a boolean value'
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { 
        inStock,
        updatedAt: new Date()
      },
      include: {
        brand: true,
        category: true
      }
    });

    res.json({
      success: true,
      data: { product },
      message: `Product marked as ${inStock ? 'in stock' : 'out of stock'}`
    });
  } catch (error) {
    console.error('Update stock status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stock status',
      error: error.message
    });
  }
});

// Get all orders for admin
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;

    const where = status ? { status } : {};

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                brand: true
              }
            }
          }
        },
        address: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        orders,
        stats: {
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'PENDING').length,
          deliveredOrders: orders.filter(o => o.status === 'DELIVERED').length,
          ordersWithInstructions: orders.filter(o => o.deliveryInstructions).length
        }
      }
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// Update order status
router.put('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { order },
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// Get all users for admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search = '' } = req.query;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            prescriptions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        users,
        stats: {
          totalUsers: users.length,
          customers: users.filter(u => u.role === 'CUSTOMER').length,
          admins: users.filter(u => u.role === 'ADMIN').length,
          doctors: users.filter(u => u.role === 'DOCTOR').length
        }
      }
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Get categories
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get brands
router.get('/brands', adminAuth, async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands',
      error: error.message
    });
  }
});

// Get order details
router.get('/orders/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                brand: true,
                category: true
              }
            }
          }
        },
        address: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
});

module.exports = router;