// routes/products.js
const express = require('express');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { checkPrescriptionAccess } = require('../middleware/prescriptionFilter');

const router = express.Router();

/**
 * =============================
 * PUBLIC ROUTES (NO AUTH)
 * =============================
 */

// Test endpoint
router.get('/test', productController.testEndpoint);

// Product listing (must be public)
router.get('/', productController.getProducts);

// Search products (public)
router.get('/search', productController.searchProducts);

// Single product page (public)
router.get('/:slug', productController.getProductBySlug);

/**
 * =============================
 * PROTECTED ROUTES (OPTIONAL)
 * =============================
 * Use these later for:
 * - Adding prescriptions to cart
 * - Uploading prescriptions
 * - Restricted checkout
 */

// Example (not active yet):
// router.post(
//   '/:id/prescription-check',
//   authenticate,
//   checkPrescriptionAccess,
//   productController.verifyPrescription
// );

module.exports = router;
