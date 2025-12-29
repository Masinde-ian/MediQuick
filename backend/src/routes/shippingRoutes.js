const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Public routes
router.post('/calculate', shippingController.calculateShipping);
router.get('/zones', shippingController.getShippingZones);
router.get('/zone/:area', shippingController.getZoneForArea);

// NEW: Get shipping estimate for address (requires auth)
router.get('/estimate/:addressId', authenticate, shippingController.estimateShipping);

// Admin routes - use 'adminOnly' instead of 'isAdmin'
router.put('/admin/update', authenticate, adminOnly, shippingController.updateShippingPrices);

module.exports = router;