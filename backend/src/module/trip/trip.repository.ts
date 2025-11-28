import { Trip, TripStop } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class TripRepository {
    /**
     * Create a new trip with stops
     */
    async createTrip(data: {
        userId: string;
        name?: string;
        startLat: number;
        startLng: number;
        startAddress?: string;
        endLat: number;
        endLng: number;
        endAddress?: string;
        stops?: Array<{
            sequence: number;
            latitude: number;
            longitude: number;
            address?: string;
        }>;
    }): Promise<Trip & { stops: TripStop[] }> {
        const { stops, ...tripData } = data;

        return await prisma.trip.create({
            data: {
                ...tripData,
                stops: stops
                    ? {
                        create: stops,
                    }
                    : undefined,
            },
            include: {
                stops: {
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
        });
    }

    /**
     * Get trip by ID (with userId check)
     */
    async getTripById(tripId: string, userId: string): Promise<(Trip & { stops: TripStop[] }) | null> {
        return await prisma.trip.findFirst({
            where: {
                id: tripId,
                userId,
            },
            include: {
                stops: {
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
        });
    }

    /**
     * Find trip by ID (no userId check - for shared access)
     */
    async findTripById(tripId: string): Promise<(Trip & { stops: TripStop[] }) | null> {
        return await prisma.trip.findUnique({
            where: {
                id: tripId,
            },
            include: {
                stops: {
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
        });
    }

    /**
     * Get user's active trip
     */
    async getActiveTrip(userId: string): Promise<(Trip & { stops: TripStop[] }) | null> {
        return await prisma.trip.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
            },
            include: {
                stops: {
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
            orderBy: {
                startedAt: 'desc',
            },
        });
    }

    /**
     * Get all trips for a user
     */
    async getAllTrips(userId: string): Promise<(Trip & { stops: TripStop[] })[]> {
        return await prisma.trip.findMany({
            where: {
                userId,
            },
            include: {
                stops: {
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
            orderBy: {
                startedAt: 'desc',
            },
        });
    }

    /**
     * Update trip status
     */
    async updateTripStatus(
        tripId: string,
        userId: string,
        status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
    ): Promise<Trip | null> {
        return await prisma.trip.updateMany({
            where: {
                id: tripId,
                userId,
            },
            data: {
                status,
                endedAt: status !== 'ACTIVE' ? new Date() : null,
            },
        }).then(async () => {
            return await prisma.trip.findFirst({
                where: {
                    id: tripId,
                    userId,
                },
            });
        });
    }

    /**
     * Add a stop to an existing trip
     */
    async addStop(
        tripId: string,
        userId: string,
        stopData: {
            sequence: number;
            latitude: number;
            longitude: number;
            address?: string;
        }
    ): Promise<TripStop | null> {
        // Verify trip belongs to user
        const trip = await prisma.trip.findFirst({
            where: {
                id: tripId,
                userId,
            },
        });

        if (!trip) {
            return null;
        }

        return await prisma.tripStop.create({
            data: {
                tripId,
                ...stopData,
            },
        });
    }

    /**
     * Mark stop as arrived
     */
    async markStopArrived(stopId: string, tripId: string, userId: string): Promise<TripStop | null> {
        // Verify trip belongs to user
        const trip = await prisma.trip.findFirst({
            where: {
                id: tripId,
                userId,
            },
        });

        if (!trip) {
            return null;
        }

        return await prisma.tripStop.update({
            where: {
                id: stopId,
            },
            data: {
                arrivedAt: new Date(),
            },
        });
    }
}

export const tripRepository = new TripRepository();
