import { crowdShieldRepository } from './crowd-shield.repository';
import { socketService } from '../../services/socket.service';
import { NotificationService } from '../../services/notification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CrowdShieldService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Trigger the Crowd Shield: Find nearby users and alert them
   */
  async triggerCrowdShield(userId: string, latitude: number, longitude: number) {
    console.log(`🛡️ Triggering Crowd Shield for User ${userId} at ${latitude}, ${longitude}`);

    // 0. Get User Details (Name)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'Someone';

    // 1. Find nearby helpers (3km radius)
    const radiusKm = 3;
    const nearbyHelpers = await crowdShieldRepository.findNearbyHelpers(latitude, longitude, radiusKm, userId);

    console.log(`📍 Found ${nearbyHelpers.length} potential helpers nearby.`);
    
    // Log details of found helpers for debugging
    nearbyHelpers.forEach(h => {
        console.log(`   - Helper: ${h.userId}, Distance: ${h.distance}km`);
    });

    if (nearbyHelpers.length === 0) {
      return { success: true, helpersNotified: 0, message: 'No helpers found nearby' };
    }

    // 2. Prepare Alert Data
    const alertData = {
      type: 'CROWD_ALERT',
      latitude,
      longitude,
      userId,
      userName,
      timestamp: new Date().toISOString(),
    };

    // 3. Send Socket Alerts (Real-time)
    // const helperIds = nearbyHelpers.map(h => h.userId); // Unused
    
    // We send individual alerts to include the specific distance for each helper
    nearbyHelpers.forEach(helper => {
      socketService.sendCrowdAlert([helper.userId], {
        ...alertData,
        distance: helper.distance // Add distance so helper knows how far they are
      });
    });

    // 4. Send Push Notifications (Background)
    const pushPromises = nearbyHelpers.map(async (helper) => {
      if (helper.pushToken && !helper.pushToken.startsWith('EXPO_GO_LOCAL_')) {
        try {
          await this.notificationService.sendPushNotificationDirect(
            helper.pushToken,
            '🚨 EMERGENCY NEARBY',
            `Someone needs help ${helper.distance.toFixed(1)}km away. Tap to view.`,
            alertData
          );
        } catch (error) {
          console.error(`Failed to push to helper ${helper.userId}`, error);
        }
      }
    });

    // Don't await push notifications to keep response fast
    Promise.all(pushPromises);

    return {
      success: true,
      helpersNotified: nearbyHelpers.length,
      helpers: nearbyHelpers.map(h => ({ userId: h.userId, distance: h.distance }))
    };
  }
}

export const crowdShieldService = new CrowdShieldService();
