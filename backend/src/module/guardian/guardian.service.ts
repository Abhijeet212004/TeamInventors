import { GuardianRepository } from './guardian.repository';
import { prisma } from '../../lib/prisma';
import { ConnectionStatus } from '@prisma/client';

export class GuardianService {
    private guardianRepository: GuardianRepository;

    constructor() {
        this.guardianRepository = new GuardianRepository();
    }

    // Get connected guardians
    async getGuardians(userId: string) {
        return this.guardianRepository.findGuardiansByUserId(userId);
    }

    // Get monitored users
    async getMonitoredUsers(guardianId: string) {
        return this.guardianRepository.findMonitoredUsersByGuardianId(guardianId);
    }

    // Send guardian request
    async sendRequest(userId: string, guardianPhone: string) {
        // Find guardian by phone
        const guardian = await prisma.user.findUnique({
            where: { phone: guardianPhone },
        });

        if (!guardian) {
            throw new Error('User with this phone number not found');
        }

        if (guardian.id === userId) {
            throw new Error('You cannot add yourself as a guardian');
        }

        // Check if connection already exists
        const existing = await prisma.guardianConnection.findUnique({
            where: {
                userId_guardianId: {
                    userId,
                    guardianId: guardian.id,
                },
            },
        });

        if (existing) {
            if (existing.status === ConnectionStatus.ACTIVE) {
                throw new Error('Already connected');
            } else if (existing.status === ConnectionStatus.PENDING) {
                throw new Error('Request already pending');
            } else {
                // Reactivate if inactive/rejected
                return this.guardianRepository.updateStatus(userId, guardian.id, ConnectionStatus.PENDING);
            }
        }

        return this.guardianRepository.createConnection(userId, guardian.id);
    }

    // Accept/Reject request or Remove Guardian
    async respondToRequest(userId: string, guardianId: string, status: ConnectionStatus) {
        return this.guardianRepository.updateStatus(userId, guardianId, status);
    }

    // Remove guardian (helper method)
    async removeGuardian(userId: string, guardianId: string) {
        return this.guardianRepository.updateStatus(userId, guardianId, ConnectionStatus.INACTIVE);
    }
}
