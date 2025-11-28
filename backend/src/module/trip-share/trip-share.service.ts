import { TripShareRepository } from './trip-share.repository';
import { GuardianRepository } from '../guardian/guardian.repository';
import { prisma } from '../../lib/prisma';
import { ConnectionStatus } from '@prisma/client';
import { notificationService } from '../../services/notification.service';

export class TripShareService {
    private tripShareRepository: TripShareRepository;

    constructor() {
        this.tripShareRepository = new TripShareRepository();
    }

    // Share trip with all connected guardians (including Bubble members)
    async shareWithAllGuardians(tripId: string, userId: string) {
        // Get all connected guardians using the repository logic that includes bubbles
        const guardianRepository = new GuardianRepository();
        const guardians = await guardianRepository.findGuardiansByUserId(userId);

        const guardianIds = guardians.map((g: any) => g.guardian.id);

        if (guardianIds.length === 0) {
            return [];
        }

        // Create shares for all guardians
        const shares = await this.tripShareRepository.createMany(tripId, guardianIds);

        // Send notifications
        try {
            // Get user name for the notification
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true },
            });

            if (user) {
                await notificationService.sendMulticastNotification(
                    guardianIds,
                    'Trip Started',
                    `${user.name} has started a new trip. Tap to track their location.`,
                    { tripId, type: 'TRIP_STARTED' }
                );

                // Mark as notified
                await this.markAsNotified(tripId, guardianIds);
            }
        } catch (error) {
            console.error('Error sending notifications:', error);
        }

        return shares;
    }

    // Share trip with specific guardians
    async shareWithGuardians(tripId: string, userId: string, guardianIds: string[]) {
        // Verify trip belongs to user
        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId },
        });

        if (!trip) {
            throw new Error('Trip not found or access denied');
        }

        // Verify all guardians are connected to user
        const connections = await prisma.guardianConnection.findMany({
            where: {
                userId,
                guardianId: { in: guardianIds },
                status: ConnectionStatus.ACTIVE,
            },
        });

        if (connections.length !== guardianIds.length) {
            throw new Error('Some guardians are not connected to you');
        }

        return this.tripShareRepository.createMany(tripId, guardianIds);
    }

    // Get viewers of a trip
    async getTripViewers(tripId: string, userId: string) {
        // Verify trip belongs to user
        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId },
        });

        if (!trip) {
            throw new Error('Trip not found or access denied');
        }

        return this.tripShareRepository.findByTripId(tripId);
    }

    // Get trips shared with user (as guardian)
    async getSharedTrips(guardianId: string) {
        return this.tripShareRepository.findByGuardianId(guardianId);
    }

    // Revoke access for a guardian
    async revokeAccess(tripId: string, userId: string, guardianId: string) {
        // Verify trip belongs to user
        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId },
        });

        if (!trip) {
            throw new Error('Trip not found or access denied');
        }

        return this.tripShareRepository.revokeAccess(tripId, guardianId);
    }

    // Check if guardian can view trip
    async canViewTrip(tripId: string, guardianId: string) {
        return this.tripShareRepository.canView(tripId, guardianId);
    }

    // Mark guardians as notified
    async markAsNotified(tripId: string, guardianIds: string[]) {
        const promises = guardianIds.map((guardianId) =>
            this.tripShareRepository.markAsNotified(tripId, guardianId)
        );
        await Promise.all(promises);
    }
}
