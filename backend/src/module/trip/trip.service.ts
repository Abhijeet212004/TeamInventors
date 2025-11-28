import { tripRepository } from './trip.repository';
import { CreateTripInput, UpdateTripStatusInput, AddStopInput } from './trip.validation';
import { TripShareService } from '../trip-share/trip-share.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GuardianRepository } from '../guardian/guardian.repository';

const tripShareService = new TripShareService();
const analyticsService = new AnalyticsService();

export class TripService {
    /**
     * Create a new trip
     */
    async createTrip(userId: string, data: CreateTripInput) {
        // Check if user already has an active trip
        const activeTrip = await tripRepository.getActiveTrip(userId);
        if (activeTrip) {
            throw new Error('You already have an active trip. Please complete or cancel it before starting a new one.');
        }

        // Create the trip
        const trip = await tripRepository.createTrip({
            userId,
            ...data,
        });

        // Auto-share with all connected guardians
        try {
            await tripShareService.shareWithAllGuardians(trip.id, userId);
        } catch (error) {
            console.error('Error auto-sharing trip:', error);
            // Don't fail trip creation if sharing fails
        }

        return trip;
    }

    /**
     * Get user's active trip
     */
    async getActiveTrip(userId: string) {
        const trip = await tripRepository.getActiveTrip(userId);
        return trip;
    }

    /**
     * Get trip by ID
     */
    async getTripById(tripId: string, userId: string) {
        let trip = await tripRepository.getTripById(tripId, userId);

        if (!trip) {
            // Check if it's a shared trip
            const canView = await tripShareService.canViewTrip(tripId, userId);
            if (!canView) {
                throw new Error('Trip not found or you do not have access to it.');
            }

            // Fetch shared trip details
            trip = await tripRepository.findTripById(tripId);
            if (!trip) {
                throw new Error('Trip not found.');
            }
        }
        return trip;
    }

    /**
     * Get all trips for a user
     */
    async getAllTrips(userId: string) {
        return await tripRepository.getAllTrips(userId);
    }

    /**
     * Get trips for a monitored user
     */
    async getTripsByUserId(targetUserId: string, guardianId: string) {
        // Verify guardian relationship
        const guardianRepository = new GuardianRepository();
        const guardians = await guardianRepository.findGuardiansByUserId(targetUserId);

        const isGuardian = guardians.some((g: any) => g.guardian.id === guardianId);
        if (!isGuardian) {
            throw new Error('You are not authorized to view this user\'s trips.');
        }

        return await tripRepository.getAllTrips(targetUserId);
    }

    /**
     * Update trip status
     */
    async updateTripStatus(tripId: string, userId: string, data: UpdateTripStatusInput) {
        const trip = await tripRepository.updateTripStatus(tripId, userId, data.status);
        if (!trip) {
            throw new Error('Trip not found or you do not have access to it.');
        }

        if (data.status === 'COMPLETED') {
            // Calculate analytics
            try {
                await analyticsService.calculateAndStoreAnalytics(tripId);
            } catch (error) {
                console.error('Error calculating analytics:', error);
            }
        }

        return trip;
    }

    /**
     * Add a stop to a trip
     */
    async addStop(tripId: string, userId: string, data: AddStopInput) {
        const stop = await tripRepository.addStop(tripId, userId, data);
        if (!stop) {
            throw new Error('Trip not found or you do not have access to it.');
        }
        return stop;
    }

    /**
     * Mark stop as arrived
     */
    async markStopArrived(tripId: string, stopId: string, userId: string) {
        const stop = await tripRepository.markStopArrived(stopId, tripId, userId);
        if (!stop) {
            throw new Error('Stop not found or you do not have access to it.');
        }
        return stop;
    }
}

export const tripService = new TripService();
