import { prisma } from '../../lib/prisma';

export class TripShareRepository {
    // Share trip with a guardian
    async create(tripId: string, guardianId: string) {
        return prisma.tripShare.create({
            data: {
                tripId,
                guardianId,
                canView: true,
                notified: false,
            },
            include: {
                guardian: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
        });
    }

    // Share trip with multiple guardians
    async createMany(tripId: string, guardianIds: string[]) {
        const shares = guardianIds.map((guardianId) => ({
            tripId,
            guardianId,
            canView: true,
            notified: false,
        }));

        await prisma.tripShare.createMany({
            data: shares,
            skipDuplicates: true,
        });

        return prisma.tripShare.findMany({
            where: { tripId },
            include: {
                guardian: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
        });
    }

    // Get all guardians who can view a trip
    async findByTripId(tripId: string) {
        return prisma.tripShare.findMany({
            where: { tripId },
            include: {
                guardian: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
        });
    }

    // Get all trips shared with a user (as guardian)
    async findByGuardianId(guardianId: string) {
        return prisma.tripShare.findMany({
            where: { guardianId, canView: true },
            include: {
                trip: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        stops: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Revoke access for a guardian
    async revokeAccess(tripId: string, guardianId: string) {
        return prisma.tripShare.updateMany({
            where: { tripId, guardianId },
            data: { canView: false },
        });
    }

    // Mark as notified
    async markAsNotified(tripId: string, guardianId: string) {
        return prisma.tripShare.updateMany({
            where: { tripId, guardianId },
            data: { notified: true },
        });
    }

    // Check if guardian can view trip
    async canView(tripId: string, guardianId: string) {
        const share = await prisma.tripShare.findFirst({
            where: { tripId, guardianId, canView: true },
        });
        return !!share;
    }

    // Delete trip share
    async delete(tripId: string, guardianId: string) {
        return prisma.tripShare.deleteMany({
            where: { tripId, guardianId },
        });
    }
}
