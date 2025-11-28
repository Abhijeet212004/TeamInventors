import { Router } from 'express';
import { crowdShieldController } from './crowd-shield.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Protect all routes
router.use(authenticate);

router.post('/trigger', crowdShieldController.triggerShield);

export default router;
