const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Access denied. Admin role required.',
    });
  }

  next();
};

router.use(authMiddleware, adminOnly);

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
};

const userRoleInclude = {
  donor: {
    select: {
      orgName: true,
      donorType: true,
      trustScore: true,
    },
  },
  ngo: {
    select: {
      ngoName: true,
      capacityPerDay: true,
      foodPreferences: true,
      isVerified: true,
      nightOperations: true,
    },
  },
  agent: {
    select: {
      vehicleType: true,
      isAvailable: true,
      rating: true,
    },
  },
};

const listingInclude = {
  donor: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  },
  match: {
    include: {
      ngo: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      delivery: {
        include: {
          agent: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

// ==================================================
// ADMIN OVERVIEW
// GET /api/admin/overview
// ==================================================
router.get('/overview', async (req, res) => {
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

// ==================================================
// USER MANAGEMENT
// GET /api/admin/users?page=1&limit=10&search=&role=ALL
// ==================================================
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';

    const role =
      typeof req.query.role === 'string'
        ? req.query.role.toUpperCase()
        : 'ALL';

    const validRoles = ['ALL', 'DONOR', 'NGO', 'AGENT', 'ADMIN'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role filter.',
      });
    }

    const where = {};

    if (role !== 'ALL') {
      where.role = role;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          donor: {
            is: {
              orgName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          ngo: {
            is: {
              ngoName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          ...safeUserSelect,
          ...userRoleInclude,
        },
      }),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + users.length < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      message: 'Failed to load users.',
    });
  }
});

// ==================================================
// USER DETAILS
// GET /api/admin/users/:id
// ==================================================
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...safeUserSelect,
        ...userRoleInclude,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Admin user details error:', error);
    res.status(500).json({
      message: 'Failed to load user details.',
    });
  }
});

// ==================================================
// NGO VERIFICATION
// PATCH /api/admin/users/:id/ngo-verification
// Body: { "isVerified": true }
// ==================================================
router.patch('/users/:id/ngo-verification', async (req, res) => {
  const { isVerified } = req.body;

  if (typeof isVerified !== 'boolean') {
    return res.status(400).json({
      message: 'isVerified must be true or false.',
    });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (targetUser.role !== 'NGO') {
      return res.status(400).json({
        message: 'Only NGO accounts can be verified.',
      });
    }

    const result = await prisma.nGOReceiver.updateMany({
      where: { userId: targetUser.id },
      data: { isVerified },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message: 'NGO profile not found.',
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUser.id },
      select: {
        ...safeUserSelect,
        ...userRoleInclude,
      },
    });

    res.json({
      message: isVerified
        ? 'NGO verified successfully.'
        : 'NGO verification revoked.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('NGO verification error:', error);
    res.status(500).json({
      message: 'Failed to update NGO verification.',
    });
  }
});

// ==================================================
// LISTING MANAGEMENT
// GET /api/admin/listings
// ==================================================
router.get('/listings', async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';

    const status =
      typeof req.query.status === 'string'
        ? req.query.status.toUpperCase()
        : 'ALL';

    const validStatuses = ['ALL', 'LISTED', 'MATCHED', 'EXPIRED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status filter.',
      });
    }

    const where = {};

    if (status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { foodTypes: { has: search } },
        {
          donor: {
            is: {
              orgName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          donor: {
            is: {
              user: {
                is: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        },
        {
          donor: {
            is: {
              user: {
                is: {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        },
      ];
    }

    const [total, listings] = await Promise.all([
      prisma.foodListing.count({ where }),
      prisma.foodListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: listingInclude,
      }),
    ]);

    res.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + listings.length < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Admin listings error:', error);
    res.status(500).json({
      message: 'Failed to load listings.',
    });
  }
});

// ==================================================
// LISTING DETAILS
// GET /api/admin/listings/:id
// ==================================================
router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await prisma.foodListing.findUnique({
      where: { id: req.params.id },
      include: listingInclude,
    });

    if (!listing) {
      return res.status(404).json({
        message: 'Listing not found.',
      });
    }

    res.json(listing);
  } catch (error) {
    console.error('Admin listing details error:', error);
    res.status(500).json({
      message: 'Failed to load listing details.',
    });
  }
});

// ==================================================
// EXPIRE LISTING
// PATCH /api/admin/listings/:id/status
// ==================================================
router.patch('/listings/:id/status', async (req, res) => {
  if (req.body.status !== 'EXPIRED') {
    return res.status(400).json({
      message:
        'Admins can manually expire a listed item. MATCHED status is managed by the matching workflow.',
    });
  }

  try {
    const result = await prisma.foodListing.updateMany({
      where: {
        id: req.params.id,
        status: 'LISTED',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count === 0) {
      const existing = await prisma.foodListing.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true },
      });

      if (!existing) {
        return res.status(404).json({
          message: 'Listing not found.',
        });
      }

      return res.status(409).json({
        message: `This listing is currently ${existing.status}. Only LISTED listings can be manually expired.`,
        currentStatus: existing.status,
      });
    }

    const listing = await prisma.foodListing.findUnique({
      where: { id: req.params.id },
      include: listingInclude,
    });

    res.json({
      message: 'Listing marked as expired.',
      listing,
    });
  } catch (error) {
    console.error('Listing status update error:', error);
    res.status(500).json({
      message: 'Failed to update listing status.',
    });
  }
});

/* ==================================================
   DELIVERY MANAGEMENT
   GET /api/admin/deliveries
   Query: page, limit, search, status
   ================================================== */
router.get('/deliveries', async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';

    const status =
      typeof req.query.status === 'string'
        ? req.query.status.toUpperCase()
        : 'ALL';

    const validStatuses = [
      'ALL',
      'ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid delivery status filter.',
      });
    }

    const where = {};

    if (status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          agent: {
            is: {
              user: {
                is: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        },
        {
          agent: {
            is: {
              user: {
                is: {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        },
        {
          match: {
            is: {
              ngo: {
                is: {
                  ngoName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        },
        {
          match: {
            is: {
              ngo: {
                is: {
                  user: {
                    is: {
                      name: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          match: {
            is: {
              listing: {
                is: {
                  foodTypes: {
                    has: search,
                  },
                },
              },
            },
          },
        },
        {
          match: {
            is: {
              listing: {
                is: {
                  donor: {
                    is: {
                      orgName: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          match: {
            is: {
              listing: {
                is: {
                  donor: {
                    is: {
                      user: {
                        is: {
                          name: {
                            contains: search,
                            mode: 'insensitive',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];
    }

    const [total, deliveries] = await Promise.all([
      prisma.delivery.count({ where }),

      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          agent: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          match: {
            include: {
              listing: {
                include: {
                  donor: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                          phone: true,
                        },
                      },
                    },
                  },
                },
              },
              ngo: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + deliveries.length < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Admin deliveries error:', error);

    res.status(500).json({
      message: 'Failed to load deliveries.',
    });
  }
});
// ==================================================
// ADMIN IMPACT REPORT
// GET /api/admin/impact
// ==================================================
router.get('/impact', async (req, res) => {
  try {
    const [
      totalFoodKgResult,
      completedDeliveries,
      activeDeliveries,
      totalDonors,
      totalNGOs,
      verifiedNGOs,
      totalListings,
      deliveredRecords,
    ] = await Promise.all([
      prisma.delivery.findMany({
        where: { status: 'DELIVERED' },
        select: {
          match: {
            select: {
              listing: {
                select: { quantityKg: true },
              },
            },
          },
        },
      }),

      prisma.delivery.count({
        where: { status: 'DELIVERED' },
      }),

      prisma.delivery.count({
        where: {
          status: {
            in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
          },
        },
      }),

      prisma.donor.count(),
      prisma.nGOReceiver.count(),
      prisma.nGOReceiver.count({
        where: { isVerified: true },
      }),
      prisma.foodListing.count(),

      prisma.delivery.findMany({
        where: { status: 'DELIVERED' },
        select: {
          deliveredAt: true,
          createdAt: true,
          match: {
            select: {
              listing: {
                select: {
                  quantityKg: true,
                  donor: {
                    select: {
                      orgName: true,
                      user: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
              ngo: {
                select: {
                  ngoName: true,
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalFoodKg = totalFoodKgResult.reduce(
      (sum, delivery) =>
        sum + (delivery.match?.listing?.quantityKg || 0),
      0
    );

    // Prepare the last six months, including months with zero deliveries.
    const monthlyMap = new Map();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;

      monthlyMap.set(key, {
        month: date.toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        deliveries: 0,
        foodKg: 0,
      });
    }

    const donorMap = new Map();
    const ngoMap = new Map();

    for (const delivery of deliveredRecords) {
      const match = delivery.match;
      if (!match) continue;

      const listing = match.listing;
      const quantityKg = listing?.quantityKg || 0;
      const deliveryDate = delivery.deliveredAt || delivery.createdAt;

      const key = `${deliveryDate.getFullYear()}-${String(
        deliveryDate.getMonth() + 1
      ).padStart(2, '0')}`;

      if (monthlyMap.has(key)) {
        const month = monthlyMap.get(key);
        month.deliveries += 1;
        month.foodKg += quantityKg;
      }

      const donorName =
        listing?.donor?.orgName ||
        listing?.donor?.user?.name ||
        'Unknown donor';

      const donor = donorMap.get(donorName) || {
        name: donorName,
        foodKg: 0,
        deliveries: 0,
      };

      donor.foodKg += quantityKg;
      donor.deliveries += 1;
      donorMap.set(donorName, donor);

      const ngoName =
        match.ngo?.ngoName ||
        match.ngo?.user?.name ||
        'Unknown NGO';

      const ngo = ngoMap.get(ngoName) || {
        name: ngoName,
        deliveries: 0,
        foodKg: 0,
      };

      ngo.deliveries += 1;
      ngo.foodKg += quantityKg;
      ngoMap.set(ngoName, ngo);
    }

    const topDonors = [...donorMap.values()]
      .sort((a, b) => b.foodKg - a.foodKg)
      .slice(0, 5);

    const topNGOs = [...ngoMap.values()]
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);

    res.set('Cache-Control', 'private, no-store');

    return res.json({
      summary: {
        totalFoodKg,
        completedDeliveries,
        activeDeliveries,
        totalDonors,
        totalNGOs,
        verifiedNGOs,
        totalListings,
      },
      monthlyTrend: [...monthlyMap.values()],
      topDonors,
      topNGOs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin impact report error:', error);

    return res.status(500).json({
      message: 'Failed to load the admin impact report.',
    });
  }
});

module.exports = router;