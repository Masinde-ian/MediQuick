const express = require('express');
const { getCategories, getCategoryBySlug, getCategoryTree } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:slug', getCategoryBySlug);

module.exports = router;