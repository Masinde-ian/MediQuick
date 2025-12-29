const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const adminAuth = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(adminAuth);

// Get low stock products
router.get('/low-stock', inventoryController.getLowStockProducts);

// Get expiring products
router.get('/expiring', inventoryController.getExpiringProducts);

// Get products needing attention
router.get('/needs-attention', inventoryController.getProductsNeedingAttention);

// Update product stock
router.put('/stock/:id', inventoryController.updateProductStock);

// Bulk stock update
router.put('/bulk-stock', inventoryController.bulkUpdateStock);

// Get inventory analytics
router.get('/analytics', inventoryController.getInventoryAnalytics);

// Send low stock report
router.post('/send-report', inventoryController.sendLowStockReport);

module.exports = router;