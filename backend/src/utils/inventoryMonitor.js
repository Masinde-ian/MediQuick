const { PrismaClient } = require('@prisma/client');
const NotificationService = require('../services/notificationService');
const prisma = new PrismaClient();

class InventoryMonitor {
  // Check low stock products
  static async checkLowStock() {
    try {
      const lowStockProducts = await prisma.product.findMany({
        where: {
          stock: {
            lte: 10
          }
        },
        include: {
          brand: true,
          category: true
        },
        orderBy: { stock: 'asc' },
        take: 20
      });

      if (lowStockProducts.length > 0) {
        // Group by severity
        const outOfStock = lowStockProducts.filter(p => p.stock === 0);
        const criticalLow = lowStockProducts.filter(p => p.stock > 0 && p.stock <= 3);
        const low = lowStockProducts.filter(p => p.stock > 3 && p.stock <= 10);

        // Send summary notification
        await NotificationService.createAdminNotification(
          'LOW_STOCK_ALERT',
          'Daily Stock Check 📊',
          `Inventory Status:\n• Out of stock: ${outOfStock.length}\n• Critical low (1-3): ${criticalLow.length}\n• Low (4-10): ${low.length}`,
          {
            outOfStockCount: outOfStock.length,
            criticalLowCount: criticalLow.length,
            lowCount: low.length,
            totalLowStock: lowStockProducts.length,
            type: 'stock'
          }
        );
      }

      return lowStockProducts;
    } catch (error) {
      console.error('Low stock check error:', error);
      throw error;
    }
  }

  // Check expiring products
  static async checkExpiringProducts() {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const expiringProducts = await prisma.product.findMany({
        where: {
          expiryDate: {
            lte: sevenDaysFromNow,
            not: null
          }
        },
        include: {
          brand: true,
          category: true
        },
        orderBy: { expiryDate: 'asc' },
        take: 20
      });

      if (expiringProducts.length > 0) {
        // Send notifications for each expiring product
        for (const product of expiringProducts) {
          await NotificationService.sendExpiryAlertNotification(product);
        }
      }

      return expiringProducts;
    } catch (error) {
      console.error('Expiring products check error:', error);
      throw error;
    }
  }

  // Check prescription products low stock
  static async checkPrescriptionStock() {
    try {
      const prescriptionProducts = await prisma.product.findMany({
        where: {
          prescriptionRequired: true,
          stock: {
            lte: 5
          }
        },
        include: {
          brand: true,
          category: true
        }
      });

      if (prescriptionProducts.length > 0) {
        await NotificationService.createAdminNotification(
          'LOW_STOCK_ALERT',
          'Prescription Medicines Low Stock ⚕️',
          `${prescriptionProducts.length} prescription medicines are low on stock.`,
          {
            count: prescriptionProducts.length,
            products: prescriptionProducts.map(p => ({
              id: p.id,
              name: p.name,
              stock: p.stock
            })),
            type: 'stock',
            priority: 'high'
          }
        );
      }

      return prescriptionProducts;
    } catch (error) {
      console.error('Prescription stock check error:', error);
      throw error;
    }
  }

  // Run all checks
  static async runAllChecks() {
    try {
      console.log('Running inventory checks...');
      
      const results = {
        lowStock: await this.checkLowStock(),
        expiring: await this.checkExpiringProducts(),
        prescription: await this.checkPrescriptionStock()
      };

      console.log('Inventory checks completed:', {
        lowStockCount: results.lowStock.length,
        expiringCount: results.expiring.length,
        prescriptionCount: results.prescription.length
      });

      return results;
    } catch (error) {
      console.error('Inventory checks failed:', error);
      throw error;
    }
  }
}

module.exports = InventoryMonitor;