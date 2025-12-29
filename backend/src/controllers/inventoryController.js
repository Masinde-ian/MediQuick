const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const NotificationService = require('../services/notificationService');

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const { threshold = 10, page = 1, limit = 20 } = req.query;
    
    const products = await prisma.product.findMany({
      where: {
        stock: {
          lte: parseInt(threshold)
        }
      },
      include: {
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
      },
      orderBy: { stock: 'asc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.product.count({
      where: {
        stock: {
          lte: parseInt(threshold)
        }
      }
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products'
    });
  }
};

// Get products nearing expiry
const getExpiringProducts = async (req, res) => {
  try {
    const { days = 30, page = 1, limit = 20 } = req.query;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));
    
    const products = await prisma.product.findMany({
      where: {
        expiryDate: {
          lte: expiryDate,
          not: null
        }
      },
      include: {
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
      },
      orderBy: { expiryDate: 'asc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    // Send expiry alerts for products expiring in next 7 days
    const urgentExpiryDate = new Date();
    urgentExpiryDate.setDate(urgentExpiryDate.getDate() + 7);
    
    const urgentExpiringProducts = products.filter(p => 
      new Date(p.expiryDate) <= urgentExpiryDate
    );
    
    // Send notifications for urgent expiring products
    if (urgentExpiringProducts.length > 0) {
      urgentExpiringProducts.forEach(async (product) => {
        try {
          await NotificationService.sendExpiryAlertNotification(product);
        } catch (error) {
          console.error('Failed to send expiry alert:', error);
        }
      });
    }

    const total = await prisma.product.count({
      where: {
        expiryDate: {
          lte: expiryDate,
          not: null
        }
      }
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get expiring products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring products'
    });
  }
};

// Update product stock
const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, operation } = req.body; // operation: 'set', 'add', 'subtract'

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let newStock = product.stock;
    
    switch (operation) {
      case 'add':
        newStock = product.stock + parseInt(stock);
        break;
      case 'subtract':
        newStock = Math.max(0, product.stock - parseInt(stock));
        break;
      case 'set':
      default:
        newStock = parseInt(stock);
        break;
    }

    const oldStock = product.stock;
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { stock: newStock },
      include: {
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
    });

    // Send notifications based on stock changes
    try {
      // If product was out of stock and now has stock
      if (oldStock === 0 && newStock > 0) {
        await NotificationService.sendStockRestockedNotification(updatedProduct, oldStock, newStock);
        
        // TODO: Notify customers who had this in wishlist or showed interest
        // For now, just log it
        console.log(`Product ${updatedProduct.name} restocked from ${oldStock} to ${newStock}`);
      }
      
      // If stock is low (below threshold)
      if (newStock > 0 && newStock <= 10) {
        await NotificationService.sendLowStockNotification(updatedProduct);
        
        // If it's a prescription product, send additional alert
        if (updatedProduct.prescriptionRequired) {
          await NotificationService.sendPrescriptionProductLowStock(updatedProduct);
        }
      }
      
      // If product is now out of stock
      if (newStock === 0 && oldStock > 0) {
        await NotificationService.sendOutOfStockNotification(updatedProduct);
      }
      
      // If stock was increased significantly
      if (newStock > oldStock && (newStock - oldStock) >= 50) {
        await NotificationService.sendStockRestockedNotification(updatedProduct, oldStock, newStock);
      }
    } catch (notificationError) {
      console.error('Failed to send stock notification:', notificationError);
      // Don't fail the whole request if notification fails
    }

    res.json({
      success: true,
      message: 'Product stock updated successfully',
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product stock'
    });
  }
};

// Bulk stock update
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { productId, stock, operation }
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const update of updates) {
      try {
        const product = await prisma.product.findUnique({
          where: { id: update.productId }
        });

        if (!product) {
          results.push({
            productId: update.productId,
            success: false,
            message: 'Product not found'
          });
          failCount++;
          continue;
        }

        const oldStock = product.stock;
        let newStock = product.stock;
        
        switch (update.operation) {
          case 'add':
            newStock = product.stock + parseInt(update.stock);
            break;
          case 'subtract':
            newStock = Math.max(0, product.stock - parseInt(update.stock));
            break;
          case 'set':
          default:
            newStock = parseInt(update.stock);
            break;
        }

        const updatedProduct = await prisma.product.update({
          where: { id: update.productId },
          data: { stock: newStock },
          include: {
            brand: true,
            category: true
          }
        });

        // Check for notification triggers
        try {
          // Stock went from 0 to positive
          if (oldStock === 0 && newStock > 0) {
            await NotificationService.sendStockRestockedNotification(updatedProduct, oldStock, newStock);
          }
          
          // Stock is now low
          if (newStock > 0 && newStock <= 10) {
            await NotificationService.sendLowStockNotification(updatedProduct);
          }
          
          // Stock is now 0
          if (newStock === 0 && oldStock > 0) {
            await NotificationService.sendOutOfStockNotification(updatedProduct);
          }
        } catch (notificationError) {
          console.error('Notification error for product', update.productId, notificationError);
        }

        results.push({
          productId: update.productId,
          success: true,
          message: 'Stock updated successfully',
          stock: updatedProduct.stock,
          oldStock,
          newStock
        });
        successCount++;
        
      } catch (error) {
        results.push({
          productId: update.productId,
          success: false,
          message: error.message
        });
        failCount++;
      }
    }

    // Send summary notification to admins
    try {
      await NotificationService.sendBulkStockUpdateSummary(updates, successCount, failCount);
    } catch (notificationError) {
      console.error('Failed to send bulk update summary:', notificationError);
    }

    res.json({
      success: true,
      message: 'Bulk stock update completed',
      data: { 
        results,
        summary: {
          total: updates.length,
          success: successCount,
          failed: failCount
        }
      }
    });
  } catch (error) {
    console.error('Bulk stock update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk stock update'
    });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    const totalProducts = await prisma.product.count();
    const outOfStock = await prisma.product.count({
      where: { stock: 0 }
    });
    const lowStock = await prisma.product.count({
      where: {
        stock: {
          lte: 10,
          gt: 0
        }
      }
    });
    
    const expiringSoon = await prisma.product.count({
      where: {
        expiryDate: {
          lte: new Date(new Date().setDate(new Date().getDate() + 30)),
          not: null
        }
      }
    });

    const totalStockValue = await prisma.product.aggregate({
      _sum: {
        stock: true
      }
    });

    // Products needing prescription
    const prescriptionProducts = await prisma.product.count({
      where: { prescriptionRequired: true }
    });

    // Send alerts if there are critical issues
    try {
      // If there are products expiring in next 3 days
      const urgentExpiryDate = new Date();
      urgentExpiryDate.setDate(urgentExpiryDate.getDate() + 3);
      
      const urgentExpiring = await prisma.product.count({
        where: {
          expiryDate: {
            lte: urgentExpiryDate,
            not: null
          }
        }
      });
      
      if (urgentExpiring > 0) {
        // Get the products
        const urgentProducts = await prisma.product.findMany({
          where: {
            expiryDate: {
              lte: urgentExpiryDate,
              not: null
            }
          },
          take: 5
        });
        
        // Send notifications for each urgent product
        for (const product of urgentProducts) {
          await NotificationService.sendExpiryAlertNotification(product);
        }
      }
      
      // Send summary notification if low stock count is high
      if (lowStock + outOfStock > 20) {
        await NotificationService.createAdminNotification(
          'LOW_STOCK_ALERT',
          'Multiple Low Stock Items 📉',
          `Inventory has ${lowStock} low stock and ${outOfStock} out of stock items. Please review inventory.`,
          {
            lowStockCount: lowStock,
            outOfStockCount: outOfStock,
            totalProducts,
            type: 'stock'
          }
        );
      }
    } catch (notificationError) {
      console.error('Analytics notification error:', notificationError);
    }

    res.json({
      success: true,
      data: {
        analytics: {
          totalProducts,
          outOfStock,
          lowStock,
          expiringSoon,
          prescriptionProducts,
          totalStock: totalStockValue._sum.stock || 0
        }
      }
    });
  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory analytics'
    });
  }
};

// New: Get products that need attention (low stock + expiring)
const getProductsNeedingAttention = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Products that are low stock OR expiring soon
    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            stock: {
              lte: 10
            }
          },
          {
            expiryDate: {
              lte: new Date(new Date().setDate(new Date().getDate() + 30)),
              not: null
            }
          }
        ]
      },
      include: {
        brand: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        }
      },
      orderBy: [
        { stock: 'asc' },
        { expiryDate: 'asc' }
      ],
      skip,
      take: parseInt(limit)
    });

    // Categorize products
    const categorized = {
      outOfStock: products.filter(p => p.stock === 0),
      lowStock: products.filter(p => p.stock > 0 && p.stock <= 10),
      expiring: products.filter(p => p.expiryDate && new Date(p.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 30))),
      critical: products.filter(p => (p.stock === 0 || p.stock <= 5) && 
        p.expiryDate && new Date(p.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 7)))
    };

    const total = await prisma.product.count({
      where: {
        OR: [
          {
            stock: {
              lte: 10
            }
          },
          {
            expiryDate: {
              lte: new Date(new Date().setDate(new Date().getDate() + 30)),
              not: null
            }
          }
        ]
      }
    });

    res.json({
      success: true,
      data: {
        products,
        categorized,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products needing attention error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products needing attention'
    });
  }
};

// New: Send low stock report to admin
const sendLowStockReport = async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lte: 10
        }
      },
      include: {
        brand: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        }
      },
      orderBy: { stock: 'asc' },
      take: 50
    });

    const outOfStockCount = lowStockProducts.filter(p => p.stock === 0).length;
    const lowStockCount = lowStockProducts.filter(p => p.stock > 0 && p.stock <= 10).length;
    
    // Create a formatted message
    let reportMessage = `📊 Low Stock Report\n\n`;
    reportMessage += `Total low stock items: ${lowStockProducts.length}\n`;
    reportMessage += `Out of stock: ${outOfStockCount}\n`;
    reportMessage += `Low stock (1-10): ${lowStockCount}\n\n`;
    
    if (lowStockProducts.length > 0) {
      reportMessage += `Top items needing attention:\n`;
      lowStockProducts.slice(0, 10).forEach((product, index) => {
        reportMessage += `${index + 1}. ${product.name} - Stock: ${product.stock}\n`;
      });
    }

    // Send notification to admins
    await NotificationService.createAdminNotification(
      'LOW_STOCK_ALERT',
      'Low Stock Report 📋',
      reportMessage,
      {
        totalLowStock: lowStockProducts.length,
        outOfStock: outOfStockCount,
        lowStock: lowStockCount,
        products: lowStockProducts.slice(0, 10).map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          brand: p.brand?.name
        })),
        type: 'stock'
      }
    );

    res.json({
      success: true,
      message: 'Low stock report sent to admins',
      data: {
        report: {
          total: lowStockProducts.length,
          outOfStock: outOfStockCount,
          lowStock: lowStockCount,
          sampleProducts: lowStockProducts.slice(0, 5)
        }
      }
    });
  } catch (error) {
    console.error('Send low stock report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send low stock report'
    });
  }
};

module.exports = {
  getLowStockProducts,
  getExpiringProducts,
  updateProductStock,
  bulkUpdateStock,
  getInventoryAnalytics,
  getProductsNeedingAttention,
  sendLowStockReport
};