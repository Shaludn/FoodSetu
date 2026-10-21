
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

// ==========================================
// ROUTES
// ==========================================

const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const matchRoutes = require('./routes/matches');
const deliveryRoutes = require('./routes/deliveries');
const adminRoutes = require('./routes/admin');

// ==========================================
// EXPRESS SERVER
// ==========================================

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// PUBLIC IMPACT REPORT
// GET /api/impact
// Aggregate statistics only; no private user data.
// ==========================================

app.get('/api/impact', async (req, res) => {
  try {
    const [
      totalDonors,
      totalNGOs,
      verifiedNGOs,
      totalListings,
      completedDeliveries,
      activeDeliveries,
      deliveredRecords,
    ] = await Promise.all([
      prisma.donor.count(),
      prisma.nGOReceiver.count(),
      prisma.nGOReceiver.count({
        where: { isVerified: true },
      }),
      prisma.foodListing.count(),
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
    ]);

    const totalFoodKg = deliveredRecords.reduce(
      (total, delivery) =>
        total + Number(delivery.match?.listing?.quantityKg ?? 0),
      0
    );

    res.set('Cache-Control', 'public, max-age=60');

    return res.json({
      summary: {
        totalFoodKg: Number(totalFoodKg.toFixed(2)),
        completedDeliveries,
        activeDeliveries,
        totalDonors,
        totalNGOs,
        verifiedNGOs,
        totalListings,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Public impact report error:', error);

    return res.status(500).json({
      message: 'Could not load FoodBridge impact statistics.',
    });
  }
});

// ==========================================
// ROOT
// ==========================================

app.get('/', (req, res) => {
  res.json({
    message: 'FoodBridge API is running',
  });
});

// ==========================================
// LATEST RIDER LOCATIONS
// ==========================================

const latestLocations = new Map();

// ==========================================
// SOCKET.IO EVENTS
// ==========================================

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_ngo', (data = {}) => {
    const { ngoId } = data;

    if (typeof ngoId !== 'string' || !ngoId.trim()) {
      console.error('❌ Invalid NGO ID for notification room');
      return;
    }

    const room = `ngo_${ngoId}`;
    socket.join(room);

    console.log(`🔔 Socket ${socket.id} joined NGO room: ${room}`);
  });

  socket.on('join_delivery', (data) => {
    const deliveryId =
      typeof data === 'string' ? data : data?.deliveryId;

    if (typeof deliveryId !== 'string' || !deliveryId.trim()) {
      console.error('❌ Missing deliveryId');
      return;
    }

    const room = `delivery_${deliveryId}`;
    socket.join(room);

    console.log(`🚪 ${socket.id} joined ${room}`);

    const lastLocation = latestLocations.get(String(deliveryId));

    if (lastLocation) {
      socket.emit('location_update', lastLocation);
      console.log('📍 Sent last location to:', socket.id);
    }
  });

  socket.on('agent_location', (data = {}) => {
    const { deliveryId, lat, lng } = data;

    if (typeof deliveryId !== 'string' || !deliveryId.trim()) {
      console.error('❌ Missing delivery ID');
      return;
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      console.error('❌ Invalid GPS coordinates');
      return;
    }

    const location = {
      deliveryId,
      lat: latitude,
      lng: longitude,
      updatedAt: new Date().toISOString(),
    };

    latestLocations.set(String(deliveryId), location);

    io.to(`delivery_${deliveryId}`).emit('location_update', location);

    console.log('📡 LOCATION BROADCASTED:', deliveryId);
  });

  socket.on('delivery_status_update', (data = {}) => {
    const { deliveryId, status } = data;

    if (
      typeof deliveryId !== 'string' ||
      !deliveryId.trim() ||
      typeof status !== 'string' ||
      !status.trim()
    ) {
      console.error('❌ Invalid delivery status update');
      return;
    }

    io.to(`delivery_${deliveryId}`).emit('delivery_status_update', {
      deliveryId,
      status,
    });

    console.log(
      `📦 STATUS BROADCASTED → delivery_${deliveryId}: ${status}`
    );
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id);
    console.log('Reason:', reason);
  });
});

// ==========================================
// AUTOMATIC DONATION EXPIRY
// ==========================================

const checkExpiredListings = async () => {
  try {
    const now = new Date();

    const listings = await prisma.foodListing.findMany({
      where: { status: 'LISTED' },
      select: {
        id: true,
        createdAt: true,
        expiryHours: true,
      },
    });

    for (const listing of listings) {
      const expiryTime = new Date(
        listing.createdAt.getTime() +
          listing.expiryHours * 60 * 60 * 1000
      );

      if (now >= expiryTime) {
        const result = await prisma.foodListing.updateMany({
          where: {
            id: listing.id,
            status: 'LISTED',
          },
          data: { status: 'EXPIRED' },
        });

        if (result.count > 0) {
          console.log(`⏰ DONATION EXPIRED: ${listing.id}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Expiry checker error:', error);
  }
};

checkExpiredListings();

const expiryInterval = setInterval(checkExpiredListings, 60 * 1000);

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('================================');
  console.log(`✅ FoodBridge server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log('📡 Socket.IO enabled');
  console.log('📍 Live GPS tracking enabled');
  console.log('📦 Live delivery status enabled');
  console.log('🔔 NGO match notifications enabled');
  console.log('🛡️ Admin API registered');
  console.log('🌱 Public Impact API registered');
  console.log('⏰ Automatic donation expiry enabled');
  console.log('================================');
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🛑 Shutting down FoodBridge server...');

  clearInterval(expiryInterval);

  io.close();

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
