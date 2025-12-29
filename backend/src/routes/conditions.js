const express = require('express');
const { 
  getConditions, 
  getConditionBySlug,
  getProductsByCondition 
} = require('../controllers/conditionController');

const router = express.Router();

// Public routes
router.get('/', getConditions);
router.get('/:slug', getConditionBySlug);
router.get('/:slug/products', getProductsByCondition); // Optional: separate endpoint for paginated products

module.exports = router;