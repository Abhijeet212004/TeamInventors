import { PrismaClient } from '@prisma/client';
import trackingRepository from '../tracking/tracking.repository';

const prisma = new PrismaClient();

export class CrowdShieldRepository {
  /**
   * Find nearby active users within a radius
   */
  async findNearbyHelpers(latitude: number, longitude: number, radiusKm: number, excludeUserId: string) {
    return await trackingRepository.findNearbyUsers(latitude, longitude, radiusKm, excludeUserId);
  }

  /**
   * Create a record of the crowd alert (Optional: for analytics/history)
   */
  async createAlertRecord(userId: string, latitude: number, longitude: number, helpersCount: number) {
    // We can add a 'CrowdAlert' model to Prisma later if we want to track history
    // For now, we just log it or return true
    return true;
  }
}

export const crowdShieldRepository = new CrowdShieldRepository();
