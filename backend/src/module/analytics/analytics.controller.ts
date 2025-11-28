import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export const getTripAnalytics = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;
        const userId = (req as any).user.id;

        console.log(`[Analytics] Fetching for trip: ${tripId}, user: ${userId}`);

        const analytics = await analyticsService.getTripAnalytics(tripId, userId);

        res.status(200).json({
            success: true,
            data: analytics,
        });
    } catch (error: any) {
        console.error('Error getting trip analytics:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get trip analytics',
        });
    }
};

export const getUserTripHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const history = await analyticsService.getUserTripHistory(userId);

        res.status(200).json({
            success: true,
            data: history,
        });
    } catch (error: any) {
        console.error('Error getting trip history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trip history',
        });
    }
};
