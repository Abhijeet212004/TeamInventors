
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tripId = '91c400ae-5d14-451a-8114-990d5644f886';
    console.log('Checking trip:', tripId);

    const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
            analytics: true,
            locations: { take: 5 }
        }
    });

    if (!trip) {
        console.log('Trip NOT found');
    } else {
        console.log('Trip found:', JSON.stringify(trip, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
