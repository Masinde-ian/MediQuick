const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notificationService } = require('./notificationController');

// Upload prescription
const uploadPrescription = async (req, res) => {
  try {
    const { orderId, notes } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Prescription file is required'
      });
    }

    // Create prescription record
    const prescription = await prisma.prescription.create({
      data: {
        userId,
        image: req.file.path,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Prescription uploaded successfully',
      data: { prescription }
    });
  } catch (error) {
    console.error('Upload prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload prescription'
    });
  }
};

// Get user prescriptions
const getUserPrescriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const prescriptions = await prisma.prescription.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { prescriptions }
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions'
    });
  }
};

// Get prescription by ID
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const prescription = await prisma.prescription.findFirst({
      where: {
        id,
        userId // Users can only access their own prescriptions
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true
          }
        }
      }
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      data: { prescription }
    });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription'
    });
  }
};

// Admin: Get all prescriptions
const getAllPrescriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const where = status ? { status } : {};
    
    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        order: {
          select: {
            orderNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.prescription.count({ where });

    res.json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions'
    });
  }
};

// Admin: Verify prescription
const verifyPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const approvedBy = req.user.id;

    if (!['APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        status,
        approvedBy,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Send notifications based on status
    if (status === 'APPROVED') {
      await notificationService.sendPrescriptionApprovedNotification(prescription, prescription.user);
    } else if (status === 'REJECTED') {
      await notificationService.sendPrescriptionRejectedNotification(prescription, prescription.user, notes);
    }

    res.json({
      success: true,
      message: `Prescription ${status.toLowerCase()} successfully`,
      data: { prescription }
    });
  } catch (error) {
    console.error('Verify prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify prescription'
    });
  }
};

module.exports = {
  uploadPrescription,
  getUserPrescriptions,
  getPrescriptionById,
  getAllPrescriptions,
  verifyPrescription
};