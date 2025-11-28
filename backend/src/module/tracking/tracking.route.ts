import { Router } from 'express';
import trackingController from './tracking.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Update tracking data (authenticated user only)
router.post('/update', authenticate, trackingController.updateTracking);

// Get my tracking data
router.get('/me', authenticate, trackingController.getMyTracking);

// Get tracking data for a specific user
router.get('/:userId', authenticate, trackingController.getTracking);

export default router;
