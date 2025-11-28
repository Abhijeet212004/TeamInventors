import { prisma } from '../../lib/prisma';

export class AnalyticsRepository {
    // Create trip analytics
    async create(data: {
        tripId: string;
        totalDistance: number;
        totalDuration: number;
        avgSpeed: number;
        maxSpeed: number;
        stopsCompleted: number;
        completedAt: Date;
    }) {
        return prisma.tripAnalytics.create({
            data,
        });
    }

    // Get analytics by trip ID
    async findByTripId(tripId: string) {
        return prisma.tripAnalytics.findUnique({
            where: { tripId },
        });
    }

    // Get full trip details with analytics and locations
    async getTripDetails(tripId: string) {
        return prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                analytics: true,
                locations: {
                    orderBy: { recordedAt: 'asc' }
                }
            }
        });
    }

    // Get user's trip history with analytics
    async getUserTripHistory(userId: string) {
        return prisma.trip.findMany({
            where: {
                userId,
                status: 'COMPLETED',
            },
            include: {
                analytics: true,
                stops: true,
            },
            orderBy: {
                startedAt: 'desc',
            },
        });
    }

    // Add location point to history
    async addLocationPoint(data: {
        tripId: string;
        latitude: number;
        longitude: number;
        speed?: number;
    }) {
        return prisma.tripLocation.create({
            data: {
                ...data,
                recordedAt: new Date(),
            },
        });
    }

    // Get trip location history
    async getTripLocations(tripId: string) {
        return prisma.tripLocation.findMany({
            where: { tripId },
            orderBy: {
                recordedAt: 'asc',
            },
        });
    }
}
