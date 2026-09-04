const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const matchRoutes = require('./routes/matches');
const deliveryRoutes = require('./routes/deliveries');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Make io accessible in routes
app.set('io', io);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/deliveries', deliveryRoutes);

app.get('/', (req, res) => {
    res.json({ message: '🌱 FoodBridge API is running' });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Agent joins delivery room
    socket.on('join_delivery', (deliveryId) => {
        socket.join(`delivery_${deliveryId}`);
        console.log(`Socket joined room: delivery_${deliveryId}`);
    });

    // Agent broadcasts GPS location
    socket.on('agent_location', ({ deliveryId, lat, lng }) => {
        // Broadcast to everyone in the delivery room
        io.to(`delivery_${deliveryId}`).emit('location_update', {
            lat,
            lng,
            deliveryId,
        });
        console.log(`📍 Location update for delivery ${deliveryId}: ${lat}, ${lng}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});