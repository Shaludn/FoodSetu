const { PrismaClient } = require('@prisma/client');
const selectVehicle = require('../utils/vehicleSelector');
const { triggerMatch } = require('./matchController');

const prisma = new PrismaClient();

// CREATE LISTING
const createListing = async(req, res) => {
    try {
        const {
            foodTypes,
            quantityKg,
            pickupTiming,
            expiryHours,
            photoUrl,
        } = req.body;

        const userId = req.user.id;

        // Get donor profile
        const donor = await prisma.donor.findUnique({ where: { userId } });
        if (!donor) {
            return res.status(400).json({ message: 'Donor profile not found. Please complete your profile.' });
        }

        // Auto select vehicle
        const vehicleNeeded = selectVehicle(quantityKg);

        // Create listing
        const listing = await prisma.foodListing.create({
            data: {
                donorId: donor.id,
                foodTypes,
                quantityKg: parseFloat(quantityKg),
                pickupTiming,
                expiryHours: expiryHours || 3,
                photoUrl,
                vehicleNeeded,
                status: 'LISTED',
            },
        });

        // Trigger matching engine automatically
        triggerMatch(listing.id, userId);

        res.status(201).json({
            message: 'Listing created and matching in progress!',
            listing,
            vehicleNeeded,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET MY LISTINGS (donor)
const getMyListings = async(req, res) => {
    try {
        const donor = await prisma.donor.findUnique({
            where: { userId: req.user.id },
        });

        if (!donor) {
            return res.status(400).json({ message: 'Donor profile not found' });
        }

        const listings = await prisma.foodListing.findMany({
            where: { donorId: donor.id },
            orderBy: { createdAt: 'desc' },
            include: { match: true },
        });

        res.json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET ALL LISTINGS (admin)
const getAllListings = async(req, res) => {
    try {
        const listings = await prisma.foodListing.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                donor: { include: { user: true } },
                match: true,
            },
        });
        res.json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createListing, getAllListings, getMyListings };