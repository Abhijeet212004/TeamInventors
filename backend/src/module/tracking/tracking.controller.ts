import { Request, Response, NextFunction } from 'express';
import trackingService from './tracking.service';

class TrackingController {
  async updateTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { batteryLevel, signalStrength, phoneStatus, speed, latitude, longitude, address, lastActiveAt } = req.body;

      const tracking = await trackingService.updateUserTracking(userId, {
        batteryLevel,
        signalStrength,
        phoneStatus,
        speed,
        latitude,
        longitude,
        address,
        lastActiveAt: lastActiveAt ? new Date(lastActiveAt) : new Date(),
      });

      res.json({
        success: true,
        data: { tracking },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const data = await trackingService.getUserTrackingWithProfile(userId);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getMyTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const data = await trackingService.getUserTrackingWithProfile(userId);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export default new TrackingController();
