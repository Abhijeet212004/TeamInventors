import { Request, Response } from 'express';
import { GuardianService } from './guardian.service';

const guardianService = new GuardianService();

export const getGuardians = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const guardians = await guardianService.getGuardians(userId);
        res.status(200).json({
            success: true,
            data: guardians,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getMonitoredUsers = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const users = await guardianService.getMonitoredUsers(userId);
        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const removeGuardian = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { guardianId } = req.params;
        await guardianService.removeGuardian(userId, guardianId);
        res.status(200).json({
            success: true,
            message: 'Guardian removed successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const sendRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { phone } = req.body;
        const connection = await guardianService.sendRequest(userId, phone);
        res.status(200).json({
            success: true,
            message: 'Guardian request sent',
            data: connection,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
