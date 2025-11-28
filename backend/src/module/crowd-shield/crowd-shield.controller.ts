import { Request, Response, NextFunction } from 'express';
import { crowdShieldService } from './crowd-shield.service';

export class CrowdShieldController {
  /**
   * Trigger Crowd Shield (Usually called internally by SOS, but exposed for testing)
   * @route POST /api/crowd-shield/trigger
   */
  async triggerShield(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        res.status(400).json({ success: false, message: 'Location required' });
        return;
      }

      const result = await crowdShieldService.triggerCrowdShield(userId, latitude, longitude);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const crowdShieldController = new CrowdShieldController();
