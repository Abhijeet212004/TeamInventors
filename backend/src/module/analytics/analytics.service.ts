import { AnalyticsRepository } from './analytics.repository';
import { prisma } from '../../lib/prisma';

export class AnalyticsService {
    private analyticsRepository: AnalyticsRepository;

    constructor() {
        this.analyticsRepository = new AnalyticsRepository();
    }

    // Calculate and store analytics for a completed trip
    async calculateAndStoreAnalytics(tripId: string) {
        // Get trip details
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { stops: true },
        });

        if (!trip || !trip.endedAt) {
            throw new Error('Trip not found or not completed');
        }

        // Get location history
        const locations = await this.analyticsRepository.getTripLocations(tripId);

        if (locations.length < 2) {
            // Not enough data for meaningful analytics
            return this.analyticsRepository.create({
                tripId,
                totalDistance: 0,
                totalDuration: Math.floor((trip.endedAt.getTime() - trip.startedAt.getTime()) / 1000),
                avgSpeed: 0,
                maxSpeed: 0,
                stopsCompleted: trip.stops.filter((s) => s.arrivedAt).length,
                completedAt: trip.endedAt,
            });
        }

        // Calculate metrics
        let totalDistance = 0;
        let maxSpeed = 0;
        let speedSum = 0;
        let speedCount = 0;

        for (let i = 0; i < locations.length - 1; i++) {
            const p1 = locations[i];
            const p2 = locations[i + 1];

            // Calculate distance between points (Haversine formula approximation or simple Euclidean for short distances)
            // Using simple calculation for now, can be improved
            const dist = this.calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
            totalDistance += dist;

            if (p1.speed !== null) {
                maxSpeed = Math.max(maxSpeed, p1.speed);
                speedSum += p1.speed;
                speedCount++;
            }
        }

        const avgSpeed = speedCount > 0 ? speedSum / speedCount : 0;
        const totalDuration = Math.floor((trip.endedAt.getTime() - trip.startedAt.getTime()) / 1000);

        return this.analyticsRepository.create({
            tripId,
            totalDistance: Math.round(totalDistance * 1000), // Store in meters
            totalDuration,
            avgSpeed: parseFloat(avgSpeed.toFixed(2)),
            maxSpeed: parseFloat(maxSpeed.toFixed(2)),
            stopsCompleted: trip.stops.filter((s) => s.arrivedAt).length,
            completedAt: trip.endedAt,
        });
    }

    // Helper: Calculate distance in km
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    // Get analytics for a trip
    async getTripAnalytics(tripId: string, userId: string) {
        // Verify access (user is owner OR guardian)
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new Error('Trip not found');

        if (trip.userId !== userId) {
            // Check if guardian
            const share = await prisma.tripShare.findFirst({
                where: { tripId, guardianId: userId, canView: true },
            });
            if (!share) {
                throw new Error('Access denied');
            }
        }

        return this.analyticsRepository.getTripDetails(tripId);
    }

    // Get user's trip history
    async getUserTripHistory(userId: string) {
        return this.analyticsRepository.getUserTripHistory(userId);
    }

    // Record location point
    async recordLocation(tripId: string, latitude: number, longitude: number, speed?: number) {
        return this.analyticsRepository.addLocationPoint({
            tripId,
            latitude,
            longitude,
            speed,
        });
    }
}
