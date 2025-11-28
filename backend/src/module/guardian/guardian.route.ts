import express from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as guardianController from './guardian.controller';

const router = express.Router();

router.get('/', authenticate, guardianController.getGuardians);
router.get('/monitored', authenticate, guardianController.getMonitoredUsers);
router.post('/request', authenticate, guardianController.sendRequest);
router.delete('/:guardianId', authenticate, guardianController.removeGuardian);

export default router;
