import { NotificationService } from '../../services/notification.service';
import { GuardianRepository } from '../guardian/guardian.repository';
import { AuthRepository } from '../auth/auth.repository';
import { PrismaClient } from '@prisma/client';
import { socketService } from '../../services/socket.service';

import { crowdShieldService } from '../crowd-shield/crowd-shield.service';

const prisma = new PrismaClient();

export class SosService {
    private notificationService: NotificationService;
    private guardianRepository: GuardianRepository;
    private authRepository: AuthRepository;

    constructor() {
        this.notificationService = new NotificationService();
        this.guardianRepository = new GuardianRepository();
        this.authRepository = new AuthRepository();
    }

    async sendSosAlert(userId: string, latitude: number, longitude: number) {
        console.log('🚨 === SOS ALERT INITIATED ===');
        console.log(`User ID: ${userId}`);
        console.log(`Location: ${latitude}, ${longitude}`);

        // 0. Trigger Crowd Shield (Parallel Process)
        // We don't await this because we want the main SOS to be fast, 
        // but we log the start.
        crowdShieldService.triggerCrowdShield(userId, latitude, longitude)
            .then(result => console.log(`🛡️ Crowd Shield Result: Notified ${result.helpersNotified} helpers`))
            .catch(err => console.error('❌ Crowd Shield Error:', err));

        // 1. Get User Details
        const user = await this.authRepository.findUserById(userId);
        if (!user) throw new Error('User not found');
        console.log(`✅ User found: ${user.name} (${user.email})`);

        // 2. Get all bubbles the user is a member of
        const bubbleMembers = await prisma.bubbleMember.findMany({
            where: { userId },
            include: {
                bubble: {
                    include: {
                        members: {
                            where: {
                                userId: { not: userId } // Exclude the SOS sender
                            },
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`📦 Found ${bubbleMembers.length} bubbles for user`);

        // 3. Collect all unique users from all bubbles
        const allMembers = new Map();
        const memberUserIds: string[] = [];

        bubbleMembers.forEach(bm => {
            console.log(`  - Bubble: ${bm.bubble.name} has ${bm.bubble.members.length} other members`);
            bm.bubble.members.forEach(member => {
                if (!allMembers.has(member.userId)) {
                    allMembers.set(member.userId, member.user);
                    memberUserIds.push(member.userId);
                    // Cast to any to access pushToken if it's not in the type definition yet
                    const userWithToken = member.user as any;
                    console.log(`    → Adding member: ${member.user.name} (${member.user.email}), Push Token: ${userWithToken.pushToken ? '✓' : '✗'}`);
                }
            });
        });

        console.log(`👥 Total unique members to notify: ${allMembers.size}`);

        // 4. Broadcast via WebSocket (works in Expo Go!)
        const sosData = {
            type: 'SOS_ALERT',
            latitude,
            longitude,
            userId,
            userName: user.name || 'User'
        };

        socketService.sendSOSAlert(memberUserIds, sosData);

        // 5. Also try push notifications (won't work in Expo Go but will work in production)
        const notificationPromises = Array.from(allMembers.values()).map(async (member: any) => {
            if (member.pushToken && !member.pushToken.startsWith('EXPO_GO_LOCAL_')) {
                try {
                    console.log(`📤 Sending push notification to ${member.name}`);
                    await this.notificationService.sendPushNotificationDirect(
                        member.pushToken,
                        'SOS ALERT! 🚨',
                        `${user.name} needs help! Tap to view location.`,
                        sosData
                    );
                    console.log(`   ✅ Push notification sent to ${member.name}`);
                } catch (error) {
                    console.error(`   ❌ Failed to send push notification to ${member.name}:`, error);
                }
            } else {
                console.log(`   ⚠️  Skipping push for ${member.name} - ${member.pushToken ? 'Expo Go user' : 'no push token'}`);
            }
        });

        await Promise.all(notificationPromises);

        console.log(`🚨 === SOS ALERT COMPLETED ===`);
        console.log(`Notified ${allMembers.size} members via WebSocket`);
        return { success: true, notifiedCount: allMembers.size };
    }
}
