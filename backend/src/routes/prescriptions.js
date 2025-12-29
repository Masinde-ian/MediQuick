const express = require('express');
const {
  uploadPrescription,
  getUserPrescriptions,
  getPrescriptionById,
  getAllPrescriptions,
  verifyPrescription
} = require('../controllers/prescriptionController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// User routes
router.use(authenticate);

router.post('/upload', upload.single('prescription'), uploadPrescription);
router.get('/user', getUserPrescriptions);
router.get('/:id', getPrescriptionById);

// Admin routes
router.get('/admin/all', authorize('ADMIN'), getAllPrescriptions);
router.put('/admin/:id/verify', authorize('ADMIN'), verifyPrescription);

module.exports = router;