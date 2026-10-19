const { PrismaClient } = require('@prisma/client');
const selectVehicle = require('../utils/vehicleSelector');
const { triggerMatch } = require('./matchController');

const prisma = new PrismaClient();


// ==========================================
// HELPER: EXPIRE OLD LISTINGS
// ==========================================

const expireOldListings = async() => {
    try {

        const now = new Date();

        const listings = await prisma.foodListing.findMany({
            where: {
                status: 'LISTED',
            },
        });

        for (const listing of listings) {

            const expiryTime = new Date(
                listing.createdAt.getTime() +
                listing.expiryHours * 60 * 60 * 1000
            );

            if (now >= expiryTime) {

                await prisma.foodListing.update({
                    where: {
                        id: listing.id,
                    },
                    data: {
                        status: 'EXPIRED',
                    },
                });

                console.log(
                    `⏰ Listing ${listing.id} expired`
                );
            }
        }

    } catch (err) {

        console.error(
            '❌ Error checking listing expiry:',
            err
        );

    }
};


// ==========================================
// CREATE LISTING
// ==========================================

const createListing = async(req, res) => {

    try {

        const {
            foodTypes,
            quantityKg,
            pickupTiming,
            expiryHours,
            photoUrl,
        } = req.body;


        const userId =
            req.user.id;


        // ======================================
        // GET DONOR PROFILE
        // ======================================

        const donor =
            await prisma.donor.findUnique({
                where: {
                    userId,
                },
            });


        if (!donor) {

            return res.status(400).json({
                message: 'Donor profile not found. Please complete your profile.',
            });

        }


        // ======================================
        // VALIDATE EXPIRY
        // ======================================

        const expiry =
            Number(expiryHours);


        if (!Number.isFinite(expiry) ||
            expiry <= 0
        ) {

            return res.status(400).json({
                message: 'Expiry time must be greater than 0 hours.',
            });

        }


        // ======================================
        // VALIDATE QUANTITY
        // ======================================

        const quantity =
            parseFloat(quantityKg);


        if (!Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            return res.status(400).json({
                message: 'Quantity must be greater than 0.',
            });

        }


        // ======================================
        // AUTO SELECT VEHICLE
        // ======================================

        const vehicleNeeded =
            selectVehicle(quantity);


        // ======================================
        // CREATE LISTING
        // ======================================

        const listing =
            await prisma.foodListing.create({

                data: {

                    donorId: donor.id,

                    foodTypes,

                    quantityKg: quantity,

                    pickupTiming,

                    expiryHours: expiry,

                    photoUrl,

                    vehicleNeeded,

                    status: 'LISTED',
                },

            });


        console.log(
            '🍱 NEW FOOD LISTING:',
            listing.id
        );

        console.log(
            '⏰ EXPIRY:',
            new Date(
                listing.createdAt.getTime() +
                expiry * 60 * 60 * 1000
            )
        );


        // ======================================
        // TRIGGER MATCHING
        // ======================================

        triggerMatch(
            listing.id,
            userId,
             req.app.get("io")
        );


        // ======================================
        // RESPONSE
        // ======================================

        res.status(201).json({

            message: 'Listing created and matching in progress!',

            listing,

            vehicleNeeded,

        });


    } catch (err) {

        console.error(
            '❌ CREATE LISTING ERROR:',
            err
        );

        res.status(500).json({
            message: 'Server error',
        });

    }

};


// ==========================================
// GET MY LISTINGS
// ==========================================

const getMyListings = async(req, res) => {

    try {

        // First check expiry

        await expireOldListings();


        const donor =
            await prisma.donor.findUnique({

                where: {
                    userId: req.user.id,
                },

            });


        if (!donor) {

            return res.status(400).json({
                message: 'Donor profile not found',
            });

        }


        const listings =
            await prisma.foodListing.findMany({

                where: {
                    donorId: donor.id,
                },

                orderBy: {
                    createdAt: 'desc',
                },

                include: {
                    match: true,
                },

            });


        res.json(
            listings
        );


    } catch (err) {

        console.error(
            '❌ GET MY LISTINGS ERROR:',
            err
        );

        res.status(500).json({
            message: 'Server error',
        });

    }

};


// ==========================================
// GET ALL LISTINGS
// ==========================================

const getAllListings = async(req, res) => {

    try {

        // Check expiry first

        await expireOldListings();


        const listings =
            await prisma.foodListing.findMany({

                orderBy: {
                    createdAt: 'desc',
                },

                include: {

                    donor: {
                        include: {
                            user: true,
                        },
                    },

                    match: true,

                },

            });


        res.json(
            listings
        );


    } catch (err) {

        console.error(
            '❌ GET ALL LISTINGS ERROR:',
            err
        );

        res.status(500).json({
            message: 'Server error',
        });

    }

};


module.exports = {
    createListing,
    getAllListings,
    getMyListings,
};