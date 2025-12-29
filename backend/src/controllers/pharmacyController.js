const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get prescription verification queue
const getPrescriptionQueue = async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;
    
    const prescriptions = await prisma.prescription.findMany({
      where: { status },
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
            orderNumber: true,
            totalAmount: true,
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    prescriptionRequired: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.prescription.count({ where: { status } });

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
    console.error('Get prescription queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription queue'
    });
  }
};

// Get pharmacy dashboard stats
const getPharmacyDashboard = async (req, res) => {
  try {
    // Prescription stats
    const prescriptionStats = await prisma.prescription.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // Order stats
    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    const todayPrescriptions = await prisma.prescription.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Pending actions
    const pendingPrescriptions = await prisma.prescription.count({
      where: { status: 'PENDING' }
    });

    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' }
    });

    res.json({
      success: true,
      data: {
        dashboard: {
          prescriptionStats,
          orderStats,
          today: {
            orders: todayOrders,
            prescriptions: todayPrescriptions
          },
          pending: {
            prescriptions: pendingPrescriptions,
            orders: pendingOrders
          }
        }
      }
    });
  } catch (error) {
    console.error('Get pharmacy dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pharmacy dashboard'
    });
  }
};

// Get orders requiring prescription verification
const getPrescriptionOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        prescriptionId: {
          not: null
        },
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        prescription: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                prescriptionRequired: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    console.error('Get prescription orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription orders'
    });
  }
};

module.exports = {
  getPrescriptionQueue,
  getPharmacyDashboard,
  getPrescriptionOrders
};