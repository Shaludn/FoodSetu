
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ==========================================
// CALCULATE DISTANCE
// ==========================================

const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// ==========================================
// FIND BEST NGO
// ==========================================

const findBestNGO = async (
    listing,
    donorLat,
    donorLng,
    isNightTime
) => {
    const ngos = await prisma.nGOReceiver.findMany({
        where: {
            isVerified: false,
            ...(isNightTime && {
                nightOperations: true,
            }),
        },
        include: {
            user: true,
        },
    });

    if (ngos.length === 0) {
        return null;
    }

    const ngosWithLocation = ngos.filter(
        (ngo) =>
            ngo.user.locationLat !== null &&
            ngo.user.locationLng !== null
    );

    if (ngosWithLocation.length === 0) {
        return ngos[0];
    }

    let bestNGO = null;
    let shortestDistance = Infinity;

    ngosWithLocation.forEach((ngo) => {
        const distance = calculateDistance(
            donorLat,
            donorLng,
            ngo.user.locationLat,
            ngo.user.locationLng
        );

        if (distance < shortestDistance) {
            shortestDistance = distance;
            bestNGO = ngo;
        }
    });

    return bestNGO;
};

// ==========================================
// TRIGGER MATCH + NOTIFICATION
// ==========================================

const triggerMatch = async (listingId, donorUserId, io) => {
    try {
        // GET LISTING
        const listing = await prisma.foodListing.findUnique({
            where: {
                id: listingId,
            },
            include: {
                donor: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!listing) {
            console.log('❌ Listing not found:', listingId);
            return;
        }

        // CHECK CURRENT STATUS
        if (listing.status !== 'LISTED') {
            console.log(
                `⚠️ Listing ${listingId} is already ${listing.status}`
            );
            return;
        }

        // CHECK EXPIRY
        const expiryTime = new Date(
            listing.createdAt.getTime() +
            listing.expiryHours * 60 * 60 * 1000
        );

        console.log('⏰ Listing expiry:', expiryTime);

        if (new Date() >= expiryTime) {
            await prisma.foodListing.update({
                where: {
                    id: listingId,
                },
                data: {
                    status: 'EXPIRED',
                },
            });

            console.log(
                `⏰ Listing ${listingId} expired before matching`
            );
            return;
        }

        // DONOR LOCATION
        const donorLat =
            listing.donor.user.locationLat ?? 12.9716;

        const donorLng =
            listing.donor.user.locationLng ?? 77.5946;

        // CHECK NIGHT TIME
        const hour = new Date().getHours();
        const isNightTime = hour >= 21 || hour < 6;

        // FIND BEST NGO
        const bestNGO = await findBestNGO(
            listing,
            donorLat,
            donorLng,
            isNightTime
        );

        if (!bestNGO) {
            console.log(
                '⚠️ No NGO available for listing:',
                listingId
            );
            return;
        }

        // CHECK EXPIRY AND STATUS AGAIN
        const latestListing = await prisma.foodListing.findUnique({
            where: {
                id: listingId,
            },
        });

        if (!latestListing) {
            return;
        }

        const latestExpiry = new Date(
            latestListing.createdAt.getTime() +
            latestListing.expiryHours * 60 * 60 * 1000
        );

        if (
            new Date() >= latestExpiry ||
            latestListing.status !== 'LISTED'
        ) {
            if (latestListing.status === 'LISTED') {
                await prisma.foodListing.update({
                    where: {
                        id: listingId,
                    },
                    data: {
                        status: 'EXPIRED',
                    },
                });
            }

            console.log(
                `⏰ Listing ${listingId} expired or changed before match creation`
            );
            return;
        }

        // CREATE MATCH
        const match = await prisma.match.create({
            data: {
                listingId,
                ngoId: bestNGO.id,
                status: 'PENDING',
            },
        });

        // UPDATE LISTING STATUS
        await prisma.foodListing.update({
            where: {
                id: listingId,
            },
            data: {
                status: 'MATCHED',
            },
        });

        console.log(
            `✅ Match created: Listing ${listingId} → NGO ${bestNGO.ngoName}`
        );

        // ======================================
        // REAL-TIME NOTIFICATION TO NGO
        // ======================================

        if (io) {
            io.to(`ngo_${bestNGO.id}`).emit('new_match', {
                matchId: match.id,
                listingId: listing.id,
                ngoId: bestNGO.id,
                foodTypes: listing.foodTypes,
                quantityKg: listing.quantityKg,
                status: 'PENDING',
                message:
                    'A new food donation has been matched with your NGO.',
            });

            console.log(
                `🔔 Match notification emitted to NGO: ${bestNGO.ngoName}`
            );
        } else {
            console.warn(
                '⚠️ Socket.IO instance not provided; notification not emitted.'
            );
        }

        return match;
    } catch (err) {
        console.error('❌ Match error:', err);
    }
};

module.exports = {
    triggerMatch,
};
