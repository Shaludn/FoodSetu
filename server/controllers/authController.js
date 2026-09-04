const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// REGISTER
const register = async(req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                passwordHash,
                role,
            },
        });

        // Auto-create role profile
        if (role === 'DONOR') {
            await prisma.donor.create({
                data: {
                    userId: user.id,
                    donorType: 'RESTAURANT',
                    orgName: name,
                    trustScore: 5.0,
                },
            });
        }

        if (role === 'NGO') {
            await prisma.nGOReceiver.create({
                data: {
                    userId: user.id,
                    ngoName: name,
                    capacityPerDay: 100,
                    foodPreferences: [],
                    isVerified: false,
                },
            });
        }

        if (role === 'AGENT') {
            await prisma.deliveryAgent.create({
                data: {
                    userId: user.id,
                    vehicleType: 'BIKE',
                    isAvailable: true,
                    rating: 5.0,
                },
            });
        }

        // Generate token
        const token = jwt.sign({ id: user.id, role: user.role },
            process.env.JWT_SECRET, { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// LOGIN
const login = async(req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role },
            process.env.JWT_SECRET, { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login };