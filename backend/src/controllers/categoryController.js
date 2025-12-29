const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null // Root categories only
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                _count: {
                  select: { products: true }
                }
              }
            },
            _count: {
              select: { products: true }
            }
          }
        },
        _count: {
          select: {
            products: true,
            children: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          include: {
            parent: true // Full breadcrumb
          }
        },
        children: {
          include: {
            _count: {
              select: { products: true }
            }
          }
        },
        products: {
          include: {
            brand: true,
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
            products: true,
            children: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get all leaf categories under this category for filtering
    let leafCategories = [];
    if (!category.isLeaf) {
      leafCategories = await prisma.category.findMany({
        where: {
          OR: [
            { parentId: category.id },
            { parent: { parentId: category.id } }
          ],
          isLeaf: true
        },
        include: {
          _count: {
            select: { products: true }
          }
        }
      });
    }

    res.json({
      success: true,
      data: { 
        category,
        leafCategories: leafCategories.filter(lc => lc._count.products > 0)
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getCategoryTree = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      where: {
        parentId: null
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  getCategoryTree
};