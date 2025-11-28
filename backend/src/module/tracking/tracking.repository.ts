import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

class TrackingRepository {
  async updateTracking(userId: string, data: TrackingData) {
    return await prisma.userTracking.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...data,
      },
    });
  }

  async getTracking(userId: string) {
    return await prisma.userTracking.findUnique({
      where: { userId },
    });
  }

  async getTrackingWithUser(userId: string) {
    const tracking = await prisma.userTracking.findUnique({
      where: { userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    return {
      user,
      tracking,
    };
  }

  async findNearbyUsers(latitude: number, longitude: number, radiusKm: number, excludeUserId: string) {
    console.log(`🔍 Searching for users near ${latitude}, ${longitude} within ${radiusKm}km (excluding ${excludeUserId})`);
    
    // DEBUG: Log all tracking data to see what's in the DB
    const allTracking = await prisma.userTracking.findMany();
    console.log('📊 CURRENT DB STATE (UserTracking):');
    allTracking.forEach(t => {
      console.log(`   - User ${t.userId}: ${t.latitude}, ${t.longitude} (Updated: ${t.updatedAt.toISOString()})`);
    });

    // Use raw query for distance calculation (Haversine formula)
    // We only query the tracking table here to avoid JOIN issues with raw SQL and column naming (like pushToken)
    const nearbyTrackingsRaw = await prisma.$queryRaw`
      SELECT 
        ut."userId", 
        ut.latitude, 
        ut.longitude,
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0, 
              cos(radians(${latitude}::float)) * cos(radians(ut.latitude::float)) * 
              cos(radians(ut.longitude::float) - radians(${longitude}::float)) + 
              sin(radians(${latitude}::float)) * sin(radians(ut.latitude::float))
            ))
          )
        ) AS distance
      FROM "user_tracking" ut
      WHERE 
        ut.latitude IS NOT NULL 
        AND ut.longitude IS NOT NULL
        AND ut."userId" != ${excludeUserId}
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0, 
              cos(radians(${latitude}::float)) * cos(radians(ut.latitude::float)) * 
              cos(radians(ut.longitude::float) - radians(${longitude}::float)) + 
              sin(radians(${latitude}::float)) * sin(radians(ut.latitude::float))
            ))
          )
        ) <= ${radiusKm}::float
      ORDER BY distance ASC
    `;

    const results = nearbyTrackingsRaw as Array<{
      userId: string;
      latitude: number;
      longitude: number;
      distance: number;
    }>;

    console.log(`✅ Raw query found ${results.length} nearby tracking records`);

    if (results.length === 0) {
      return [];
    }

    // Fetch user details (pushToken) separately to avoid raw SQL JOIN issues
    const userIds = results.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        pushToken: true
      }
    });

    // Map users back to results
    const finalResults = results.map(r => {
      const user = users.find(u => u.id === r.userId);
      return {
        ...r,
        pushToken: user?.pushToken || null
      };
    }).filter(item => item.pushToken !== undefined); // Keep them even if pushToken is null, just ensure user exists? 
    // Actually the interface expects pushToken: string | null.
    
    console.log(`✅ Returning ${finalResults.length} nearby users with details`);
    return finalResults;
  }
}

export default new TrackingRepository();
