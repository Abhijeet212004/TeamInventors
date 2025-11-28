import { prisma } from '../../lib/prisma';
import { ConnectionStatus } from '@prisma/client';

export class GuardianRepository {
    // Get all guardians for a user (including Bubble members)
    async findGuardiansByUserId(userId: string) {
        // 1. Get explicit guardians
        const explicitGuardians = await prisma.guardianConnection.findMany({
            where: {
                userId,
                status: ConnectionStatus.ACTIVE,
            },
            include: {
                guardian: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        // 2. Get Bubble members (excluding self)
        const bubbles = await prisma.bubble.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { members: { some: { userId } } },
                ],
                isActive: true,
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                            },
                        },
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        // 3. Get blocked/inactive guardians to exclude
        const blockedGuardians = await prisma.guardianConnection.findMany({
            where: {
                userId,
                status: { in: [ConnectionStatus.INACTIVE, ConnectionStatus.REJECTED] },
            },
            select: { guardianId: true },
        });
        const blockedIds = new Set(blockedGuardians.map(g => g.guardianId));

        // 4. Merge and filter
        const guardianMap = new Map<string, any>();

        // Add explicit guardians
        explicitGuardians.forEach(g => {
            guardianMap.set(g.guardian.id, {
                id: g.id,
                guardian: g.guardian,
                status: g.status,
            });
        });

        // Add bubble members
        bubbles.forEach(bubble => {
            // Add creator if not self
            if (bubble.creatorId !== userId && !blockedIds.has(bubble.creatorId)) {
                if (!guardianMap.has(bubble.creatorId)) {
                    guardianMap.set(bubble.creatorId, {
                        id: `bubble-${bubble.id}-${bubble.creatorId}`, // Virtual ID
                        guardian: bubble.creator,
                        status: 'BUBBLE_MEMBER', // Virtual status
                    });
                }
            }

            // Add members if not self
            bubble.members.forEach(member => {
                if (member.userId !== userId && !blockedIds.has(member.userId)) {
                    if (!guardianMap.has(member.userId)) {
                        guardianMap.set(member.userId, {
                            id: `bubble-${bubble.id}-${member.userId}`, // Virtual ID
                            guardian: member.user,
                            status: 'BUBBLE_MEMBER', // Virtual status
                        });
                    }
                }
            });
        });

        const result = Array.from(guardianMap.values());
        return result;
    }

    // Get all users monitored by a guardian
    async findMonitoredUsersByGuardianId(guardianId: string) {
        return prisma.guardianConnection.findMany({
            where: {
                guardianId,
                status: ConnectionStatus.ACTIVE,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });
    }

    // Create a guardian connection request
    async createConnection(userId: string, guardianId: string) {
        return prisma.guardianConnection.create({
            data: {
                userId,
                guardianId,
                status: ConnectionStatus.PENDING,
            },
        });
    }

    // Update connection status or block bubble member
    async updateStatus(userId: string, guardianId: string, status: ConnectionStatus) {
        // Check if connection exists
        const existing = await prisma.guardianConnection.findUnique({
            where: {
                userId_guardianId: {
                    userId,
                    guardianId,
                },
            },
        });

        if (existing) {
            return prisma.guardianConnection.update({
                where: {
                    userId_guardianId: {
                        userId,
                        guardianId,
                    },
                },
                data: { status },
            });
        } else {
            // If no connection exists (e.g., Bubble member), create one with the new status
            return prisma.guardianConnection.create({
                data: {
                    userId,
                    guardianId,
                    status,
                },
            });
        }
    }
}
