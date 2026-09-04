const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// NGO responds to a match
router.patch('/:matchId/respond', authMiddleware, async(req, res) => {
    try {
        const { status } = req.body;

        const match = await prisma.match.update({
            where: { id: req.params.matchId },
            data: {
                status,
                respondedAt: new Date(),
            },
        });

        // If accepted, find nearest agent and create delivery
        if (status === 'ACCEPTED') {
            const listing = await prisma.foodListing.findUnique({
                where: { id: match.listingId },
            });

            // Find available agent with matching vehicle
            const agent = await prisma.deliveryAgent.findFirst({
                where: {
                    isAvailable: true,
                    vehicleType: listing.vehicleNeeded,
                },
            });

            // If no exact vehicle match, find any available agent
            const anyAgent = agent || await prisma.deliveryAgent.findFirst({
                where: { isAvailable: true },
            });

            if (anyAgent) {
                // Create delivery
                await prisma.delivery.create({
                    data: {
                        matchId: match.id,
                        agentId: anyAgent.id,
                        status: 'ASSIGNED',
                    },
                });

                // Mark agent as unavailable
                await prisma.deliveryAgent.update({
                    where: { id: anyAgent.id },
                    data: { isAvailable: false },
                });

                console.log(`✅ Agent ${anyAgent.id} assigned to delivery`);
            } else {
                console.log('No agent available right now');
            }
        }

        res.json({ message: `Match ${status}`, match });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get matches for NGO
router.get('/my-matches', authMiddleware, async(req, res) => {
    try {
        const ngo = await prisma.nGOReceiver.findUnique({
            where: { userId: req.user.id },
        });

        if (!ngo) {
            return res.status(400).json({ message: 'NGO profile not found' });
        }

        const matches = await prisma.match.findMany({
            where: { ngoId: ngo.id },
            include: {
                listing: {
                    include: { donor: { include: { user: true } } },
                },
                delivery: true,
            },
            orderBy: { notifiedAt: 'desc' },
        });

        res.json(matches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get NGO profile
router.get('/profile', authMiddleware, async(req, res) => {
    try {
        const ngo = await prisma.nGOReceiver.findUnique({
            where: { userId: req.user.id },
            include: { user: true },
        });
        if (!ngo) {
            return res.status(404).json({ message: 'NGO profile not found' });
        }
        res.json(ngo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update NGO profile
router.put('/profile', authMiddleware, async(req, res) => {
    try {
        const {
            ngoName,
            capacityPerDay,
            foodPreferences,
            nightOperations,
            locationLat,
            locationLng,
        } = req.body;

        // Update NGO profile
        // Update NGO profile
        const ngo = await prisma.nGOReceiver.update({
            where: { userId: req.user.id },
            data: {
                ngoName,
                capacityPerDay: parseInt(capacityPerDay),
                foodPreferences,
            },
        });

        // Update user location
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                locationLat: parseFloat(locationLat),
                locationLng: parseFloat(locationLng),
            },
        });

        res.json({ message: 'Profile updated successfully', ngo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;