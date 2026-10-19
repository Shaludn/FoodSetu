
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

const proofDirectory = path.join(__dirname, '..', 'uploads', 'delivery-proofs');
fs.mkdirSync(proofDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, proofDirectory),
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) ? extension : '.jpg';
        cb(null, `proof-${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
    }
});

const uploadProof = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'));
        }
        cb(null, true);
    }
});

// Update delivery status. Proof is required for completion.
router.patch('/:deliveryId/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['PICKED_UP', 'IN_TRANSIT'].includes(status)) {
            return res.status(400).json({
                message: 'Upload proof of delivery to complete a delivery.'
            });
        }

        const agent = await prisma.deliveryAgent.findUnique({
            where: { userId: req.user.id }
        });

        if (!agent) {
            return res.status(403).json({ message: 'Delivery agent profile not found.' });
        }

        const delivery = await prisma.delivery.findUnique({
            where: { id: req.params.deliveryId }
        });

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found.' });
        }

        if (delivery.agentId !== agent.id) {
            return res.status(403).json({ message: 'This delivery is not assigned to you.' });
        }

        const allowedTransitions = {
            ASSIGNED: ['PICKED_UP'],
            PICKED_UP: ['IN_TRANSIT'],
            IN_TRANSIT: [],
            DELIVERED: []
        };

        if (!allowedTransitions[delivery.status]?.includes(status)) {
            return res.status(400).json({
                message: `Cannot change delivery from ${delivery.status} to ${status}.`
            });
        }

        const data = { status };

        if (status === 'PICKED_UP') {
            data.pickedUpAt = new Date();
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id: delivery.id },
            data
        });

        return res.json({ message: 'Status updated.', delivery: updatedDelivery });
    } catch (err) {
        console.error('Delivery status update error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
});

// Upload proof and mark delivery as delivered.
router.post(
    '/:deliveryId/proof',
    authMiddleware,
    (req, res, next) => {
        uploadProof.single('proof')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    message: err.message || 'Unable to upload image.'
                });
            }
            next();
        });
    },
    async (req, res) => {
        let uploadedFilePath = null;

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: 'Please select a proof photo.'
                });
            }

            uploadedFilePath = req.file.path;

            const agent = await prisma.deliveryAgent.findUnique({
                where: { userId: req.user.id }
            });

            if (!agent) {
                return res.status(403).json({
                    message: 'Only delivery agents can upload proof.'
                });
            }

            const delivery = await prisma.delivery.findUnique({
                where: { id: req.params.deliveryId }
            });

            if (!delivery) {
                return res.status(404).json({ message: 'Delivery not found.' });
            }

            if (delivery.agentId !== agent.id) {
                return res.status(403).json({
                    message: 'This delivery is not assigned to you.'
                });
            }

            if (delivery.status !== 'IN_TRANSIT') {
                return res.status(400).json({
                    message: 'The delivery must be IN_TRANSIT before proof can be submitted.'
                });
            }

            const proofPhotoUrl =
                `${req.protocol}://${req.get('host')}/uploads/delivery-proofs/${req.file.filename}`;

            const deliveredAt = new Date();

            const updatedDelivery = await prisma.$transaction(async (tx) => {
                const updated = await tx.delivery.update({
                    where: { id: delivery.id },
                    data: {
                        proofPhotoUrl,
                        status: 'DELIVERED',
                        deliveredAt
                    }
                });

                await tx.deliveryAgent.update({
                    where: { id: agent.id },
                    data: { isAvailable: true }
                });

                return updated;
            });

            return res.json({
                message: 'Proof uploaded and delivery marked as delivered.',
                delivery: updatedDelivery
            });
        } catch (err) {
            console.error('Proof upload error:', err);

            if (uploadedFilePath) {
                fs.promises.unlink(uploadedFilePath).catch(() => {});
            }

            return res.status(500).json({
                message: 'Failed to save proof of delivery.'
            });
        }
    }
);

// Get agent's deliveries.
router.get('/my-deliveries', authMiddleware, async (req, res) => {
    try {
        const agent = await prisma.deliveryAgent.findUnique({
            where: { userId: req.user.id }
        });

        if (!agent) {
            return res.status(400).json({ message: 'Agent profile not found.' });
        }

        const deliveries = await prisma.delivery.findMany({
            where: { agentId: agent.id },
            include: {
                match: {
                    include: {
                        listing: {
                            include: {
                                donor: {
                                    include: { user: true }
                                }
                            }
                        },
                        ngo: {
                            include: { user: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json(deliveries);
    } catch (err) {
        console.error('Fetch deliveries error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
});

// Get agent profile.
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const agent = await prisma.deliveryAgent.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });

        if (!agent) {
            return res.status(404).json({ message: 'Agent profile not found.' });
        }

        return res.json(agent);
    } catch (err) {
        console.error('Fetch agent profile error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
});

// Update agent profile.
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { vehicleType, locationLat, locationLng } = req.body;

        if (!['BIKE', 'SCOOTER', 'TEMPO'].includes(vehicleType)) {
            return res.status(400).json({ message: 'Invalid vehicle type.' });
        }

        const agent = await prisma.deliveryAgent.update({
            where: { userId: req.user.id },
            data: { vehicleType }
        });

        const lat = locationLat === '' || locationLat == null ? null : Number(locationLat);
        const lng = locationLng === '' || locationLng == null ? null : Number(locationLng);

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                locationLat: Number.isFinite(lat) ? lat : null,
                locationLng: Number.isFinite(lng) ? lng : null
            }
        });

        return res.json({
            message: 'Profile updated successfully.',
            agent
        });
    } catch (err) {
        console.error('Update agent profile error:', err);
        return res.status(500).json({ message: err.message });
    }
});

// Toggle agent availability.
router.patch('/availability', authMiddleware, async (req, res) => {
    try {
        if (typeof req.body.isAvailable !== 'boolean') {
            return res.status(400).json({
                message: 'isAvailable must be true or false.'
            });
        }

        const agent = await prisma.deliveryAgent.update({
            where: { userId: req.user.id },
            data: { isAvailable: req.body.isAvailable }
        });

        return res.json({ message: 'Availability updated.', agent });
    } catch (err) {
        console.error('Update agent availability error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
