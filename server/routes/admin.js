
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Only authenticated admins can access these endpoints
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Access denied. Admin role required.',
    });
  }

  next();
};

// GET /api/admin/overview
router.get('/overview', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalNGOs,
      totalAgents,
      totalListings,
      activeListings,
      matchedListings,
      expiredListings,
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      recentListings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.donor.count(),
      prisma.nGOReceiver.count(),
      prisma.deliveryAgent.count(),
      prisma.foodListing.count(),
      prisma.foodListing.count({ where: { status: 'LISTED' } }),
      prisma.foodListing.count({ where: { status: 'MATCHED' } }),
      prisma.foodListing.count({ where: { status: 'EXPIRED' } }),
      prisma.delivery.count(),
      prisma.delivery.count({
        where: {
          status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
        },
      }),
      prisma.delivery.count({ where: { status: 'DELIVERED' } }),
      prisma.foodListing.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        donors: totalDonors,
        ngos: totalNGOs,
        agents: totalAgents,
      },
      listings: {
        total: totalListings,
        active: activeListings,
        matched: matchedListings,
        expired: expiredListings,
      },
      deliveries: {
        total: totalDeliveries,
        active: activeDeliveries,
        completed: completedDeliveries,
      },
      recentListings,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({
      message: 'Failed to load admin dashboard data.',
    });
  }
});

module.exports = router;
