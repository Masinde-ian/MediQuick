// backend/src/routes/addresses.js
const express = require('express');
const { 
  getUserAddresses, 
  createAddress, 
  updateAddress, 
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getUserAddresses);
router.post('/', createAddress);
router.put('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);

// Support both PUT and PATCH for setting default address
router.put('/:addressId/default', setDefaultAddress);
router.patch('/:addressId/default', setDefaultAddress);

module.exports = router;