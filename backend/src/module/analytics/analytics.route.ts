import express from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as analyticsController from './analytics.controller';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Trip Analytics
 *   description: API for trip analytics and history
 */

/**
 * @swagger
 * /api/trips/{tripId}/analytics:
 *   get:
 *     summary: Get analytics for a specific trip
 *     tags: [Trip Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip analytics data
 *       400:
 *         description: Bad request
 */
router.get('/:tripId/analytics', authenticate, analyticsController.getTripAnalytics);

/**
 * @swagger
 * /api/users/trip-history:
 *   get:
 *     summary: Get user's trip history with analytics
 *     tags: [Trip Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of past trips
 */
router.get('/history', authenticate, analyticsController.getUserTripHistory);

export default router;
