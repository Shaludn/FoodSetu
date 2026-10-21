const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function buildImpactReport() {
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
    prisma.nGOReceiver.count({ where: { isVerified: true } }),
    prisma.foodListing.count(),
    prisma.delivery.count({ where: { status: 'DELIVERED' } }),
    prisma.delivery.count({
      where: {
        status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
    }),
    prisma.delivery.findMany({
      where: { status: 'DELIVERED' },
      select: {
        deliveredAt: true,
        match: {
          select: {
            listing: {
              select: {
                quantityKg: true,
                donor: {
                  select: {
                    orgName: true,
                    user: { select: { name: true } },
                  },
                },
              },
            },
            ngo: {
              select: {
                ngoName: true,
              },
            },
          },
        },
      },
      orderBy: { deliveredAt: 'desc' },
    }),
  ]);

  let totalFoodKg = 0;
  const monthlyMap = new Map();
  const donorMap = new Map();
  const ngoMap = new Map();

  for (const delivery of deliveredRecords) {
    const listing = delivery.match?.listing;
    const quantity = Number(listing?.quantityKg ?? 0);

    totalFoodKg += quantity;

    if (delivery.deliveredAt) {
      const date = new Date(delivery.deliveredAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;

      const month = monthlyMap.get(monthKey) ?? {
        month: monthKey,
        deliveries: 0,
        foodKg: 0,
      };

      month.deliveries += 1;
      month.foodKg += quantity;
      monthlyMap.set(monthKey, month);
    }

    const donorName =
      listing?.donor?.orgName ||
      listing?.donor?.user?.name ||
      'Unknown donor';

    const donor = donorMap.get(donorName) ?? {
      name: donorName,
      deliveries: 0,
      foodKg: 0,
    };

    donor.deliveries += 1;
    donor.foodKg += quantity;
    donorMap.set(donorName, donor);

    const ngoName = delivery.match?.ngo?.ngoName || 'Unknown NGO';

    const ngo = ngoMap.get(ngoName) ?? {
      name: ngoName,
      deliveries: 0,
      foodKg: 0,
    };

    ngo.deliveries += 1;
    ngo.foodKg += quantity;
    ngoMap.set(ngoName, ngo);
  }

  const byFoodKg = (a, b) => b.foodKg - a.foodKg;

  return {
    summary: {
      totalFoodKg: Number(totalFoodKg.toFixed(2)),
      completedDeliveries,
      activeDeliveries,
      totalDonors,
      totalNGOs,
      verifiedNGOs,
      totalListings,
    },
    monthlyTrend: Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map((item) => ({
        ...item,
        foodKg: Number(item.foodKg.toFixed(2)),
      })),
    topDonors: Array.from(donorMap.values())
      .sort(byFoodKg)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        foodKg: Number(item.foodKg.toFixed(2)),
      })),
    topNGOs: Array.from(ngoMap.values())
      .sort(byFoodKg)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        foodKg: Number(item.foodKg.toFixed(2)),
      })),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { buildImpactReport };