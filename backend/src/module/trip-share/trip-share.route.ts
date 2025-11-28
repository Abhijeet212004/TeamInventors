import express from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as tripShareController from './trip-share.controller';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Trip Sharing
 *   description: API for sharing trips with guardians
 */

/**
 * @swagger
 * /api/trips/{tripId}/share:
 *   post:
 *     summary: Share a trip with guardians
 *     tags: [Trip Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guardianIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of guardian IDs. If omitted, shares with all connected guardians.
 *     responses:
 *       200:
 *         description: Trip shared successfully
 *       400:
 *         description: Bad request
 */
router.post('/:tripId/share', authenticate, tripShareController.shareTrip);
router.get('/:tripId/viewers', authenticate, tripShareController.getTripViewers);
router.get('/shared-with-me', authenticate, tripShareController.getSharedTrips);
router.delete('/:tripId/share/:guardianId', authenticate, tripShareController.revokeAccess);

export default router;
