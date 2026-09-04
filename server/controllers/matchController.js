const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const findBestNGO = async(listing, donorLat, donorLng, isNightTime) => {
    // Get all verified NGOs
    const ngos = await prisma.nGOReceiver.findMany({
        where: {
            isVerified: false, // false for now so demo works without verification
            ...(isNightTime && { nightOperations: true }),
        },
        include: { user: true },
    });

    if (ngos.length === 0) return null;

    // Filter NGOs that have location set
    const ngosWithLocation = ngos.filter(
        (ngo) => ngo.user.locationLat && ngo.user.locationLng
    );

    // If no NGO has location, just return first available NGO
    if (ngosWithLocation.length === 0) return ngos[0];

    // Find nearest NGO by distance
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

const triggerMatch = async(listingId, donorUserId) => {
    try {
        // Get listing details
        const listing = await prisma.foodListing.findUnique({
            where: { id: listingId },
            include: { donor: { include: { user: true } } },
        });

        if (!listing) return;

        const donorLat = listing.donor.user.locationLat || 12.9716; // default Bengaluru
        const donorLng = listing.donor.user.locationLng || 77.5946;

        // Check if night time (after 9 PM)
        const hour = new Date().getHours();
        const isNightTime = hour >= 21 || hour < 6;

        // Find best NGO
        const bestNGO = await findBestNGO(
            listing,
            donorLat,
            donorLng,
            isNightTime
        );

        if (!bestNGO) {
            console.log('No NGO available for listing:', listingId);
            return;
        }

        // Create match
        const match = await prisma.match.create({
            data: {
                listingId,
                ngoId: bestNGO.id,
                status: 'PENDING',
            },
        });

        // Update listing status
        await prisma.foodListing.update({
            where: { id: listingId },
            data: { status: 'MATCHED' },
        });

        console.log(`✅ Match created: Listing ${listingId} → NGO ${bestNGO.ngoName}`);
        return match;
    } catch (err) {
        console.error('Match error:', err);
    }
};

module.exports = { triggerMatch };