import { Request, Response } from 'express';
import { TripShareService } from './trip-share.service';

const tripShareService = new TripShareService();

export const shareTrip = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;
        const { guardianIds } = req.body;
        const userId = (req as any).user.id;

        let shares;

        if (guardianIds && Array.isArray(guardianIds)) {
            // Share with specific guardians
            shares = await tripShareService.shareWithGuardians(tripId, userId, guardianIds);
        } else {
            // Share with all connected guardians
            shares = await tripShareService.shareWithAllGuardians(tripId, userId);
        }

        res.status(200).json({
            success: true,
            message: 'Trip shared successfully',
            data: shares,
        });
    } catch (error: any) {
        console.error('Error sharing trip:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to share trip',
        });
    }
};

export const getTripViewers = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;
        const userId = (req as any).user.id;

        const viewers = await tripShareService.getTripViewers(tripId, userId);

        res.status(200).json({
            success: true,
            data: viewers,
        });
    } catch (error: any) {
        console.error('Error getting trip viewers:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get trip viewers',
        });
    }
};

export const getSharedTrips = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const sharedTrips = await tripShareService.getSharedTrips(userId);

        res.status(200).json({
            success: true,
            data: sharedTrips,
        });
    } catch (error: any) {
        console.error('Error getting shared trips:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shared trips',
        });
    }
};

export const revokeAccess = async (req: Request, res: Response) => {
    try {
        const { tripId, guardianId } = req.params;
        const userId = (req as any).user.id;

        await tripShareService.revokeAccess(tripId, userId, guardianId);

        res.status(200).json({
            success: true,
            message: 'Access revoked successfully',
        });
    } catch (error: any) {
        console.error('Error revoking access:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to revoke access',
        });
    }
};
