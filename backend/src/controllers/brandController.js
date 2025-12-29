const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: { brands }
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const brand = await prisma.brand.findUnique({
      where: { slug },
      include: {
        products: {
          include: {
            category: {
              include: {
                parent: {
                  include: {
                    parent: true
                  }
                }
              }
            },
            conditions: {
              include: {
                condition: true
              }
            }
          },
          skip: (page - 1) * parseInt(limit),
          take: parseInt(limit)
        },
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: { brand }
    });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getBrands,
  getBrandBySlug
};