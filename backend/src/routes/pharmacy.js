const express = require('express');
const {
  getPrescriptionQueue,
  getPharmacyDashboard,
  getPrescriptionOrders
} = require('../controllers/pharmacyController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/dashboard', getPharmacyDashboard);
router.get('/prescription-queue', getPrescriptionQueue);
router.get('/prescription-orders', getPrescriptionOrders);

module.exports = router;