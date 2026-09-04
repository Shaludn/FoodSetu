const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Agent updates delivery status
router.patch('/:deliveryId/status', authMiddleware, async(req, res) => {
    try {
        const { status } = req.body;

        const updateData = { status };
        if (status === 'PICKED_UP') updateData.pickedUpAt = new Date();
        if (status === 'DELIVERED') {
            updateData.deliveredAt = new Date();

            // Find the delivery to get agent ID
            const delivery = await prisma.delivery.findUnique({
                where: { id: req.params.deliveryId },
            });

            // Mark agent as available again after delivery
            await prisma.deliveryAgent.update({
                where: { id: delivery.agentId },
                data: { isAvailable: true },
            });
        }

        const delivery = await prisma.delivery.update({
            where: { id: req.params.deliveryId },
            data: updateData,
        });

        res.json({ message: 'Status updated', delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get agent's deliveries
router.get('/my-deliveries', authMiddleware, async(req, res) => {
    try {
        const agent = await prisma.deliveryAgent.findUnique({
            where: { userId: req.user.id },
        });

        if (!agent) {
            return res.status(400).json({ message: 'Agent profile not found' });
        }

        const deliveries = await prisma.delivery.findMany({
            where: { agentId: agent.id },
            include: {
                match: {
                    include: {
                        listing: {
                            include: { donor: { include: { user: true } } },
                        },
                        ngo: { include: { user: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(deliveries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get agent profile
router.get('/profile', authMiddleware, async(req, res) => {
    try {
        const agent = await prisma.deliveryAgent.findUnique({
            where: { userId: req.user.id },
            include: { user: true },
        });
        if (!agent) {
            return res.status(404).json({ message: 'Agent profile not found' });
        }
        res.json(agent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update agent profile
router.put('/profile', authMiddleware, async(req, res) => {
    try {
        const {
            vehicleType,
            vehicleNumber,
            serviceArea,
            locationLat,
            locationLng,
        } = req.body;

        const agent = await prisma.deliveryAgent.update({
            where: { userId: req.user.id },
            data: {
                vehicleType,
            },
        });

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                locationLat: parseFloat(locationLat),
                locationLng: parseFloat(locationLng),
            },
        });

        res.json({ message: 'Profile updated successfully', agent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Toggle agent availability
router.patch('/availability', authMiddleware, async(req, res) => {
    try {
        const { isAvailable } = req.body;

        const agent = await prisma.deliveryAgent.update({
            where: { userId: req.user.id },
            data: { isAvailable },
        });

        res.json({ message: 'Availability updated', agent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports = router;