import { Router } from 'express';
import { SosController } from './sos.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const sosController = new SosController();

router.post('/alert', authenticate, sosController.sendAlert);

export default router;
