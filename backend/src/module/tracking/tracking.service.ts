import trackingRepository from './tracking.repository';
import { tripRepository } from '../trip/trip.repository';
import { AnalyticsService } from '../analytics/analytics.service';

const analyticsService = new AnalyticsService();

interface TrackingData {
  batteryLevel?: number;
  signalStrength?: string;
  phoneStatus?: string;
  speed?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  lastActiveAt?: Date;
}

class TrackingService {
  async updateUserTracking(userId: string, data: TrackingData) {
    // Update user tracking status
    const result = await trackingRepository.updateTracking(userId, data);

    // Check if user has an active trip
    if (data.latitude && data.longitude) {
      try {
        const activeTrip = await tripRepository.getActiveTrip(userId);
        if (activeTrip) {
          // Record location for trip history
          await analyticsService.recordLocation(
            activeTrip.id,
            data.latitude,
            data.longitude,
            data.speed
          );
        }
      } catch (error) {
        console.error('Error recording trip location:', error);
        // Don't fail the tracking update if recording location fails
      }
    }

    return result;
  }

  async getUserTracking(userId: string) {
    return await trackingRepository.getTracking(userId);
  }

  async getUserTrackingWithProfile(userId: string) {
    return await trackingRepository.getTrackingWithUser(userId);
  }
}

export default new TrackingService();
