// routes/products.js - UPDATED
const express = require('express');
const { getProducts, getProductBySlug, searchProducts } = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { checkPrescriptionAccess } = require('../middleware/prescriptionFilter');

const router = express.Router();

// Apply authentication and prescription check middleware
router.use(authenticate);
router.use(checkPrescriptionAccess);

router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:slug', getProductBySlug);

module.exports = router;