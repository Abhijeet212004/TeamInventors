import express from 'express';
import { tripController } from './trip.controller';
import { authenticateToken } from '../../middleware/auth';
import {
    CreateTripSchema,
    UpdateTripStatusSchema,
    AddStopSchema,
} from './trip.validation';

const router = express.Router();

// Middleware to validate request body
const validate = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
    };
};

/**
 * @swagger
 * /api/trips:
 *   post:
 *     summary: Create a new trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startLat
 *               - startLng
 *               - endLat
 *               - endLng
 *             properties:
 *               name:
 *                 type: string
 *               startLat:
 *                 type: number
 *               startLng:
 *                 type: number
 *               startAddress:
 *                 type: string
 *               endLat:
 *                 type: number
 *               endLng:
 *                 type: number
 *               endAddress:
 *                 type: string
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Trip created successfully
 */
router.post(
    '/',
    authenticateToken,
    validate(CreateTripSchema),
    tripController.createTrip.bind(tripController)
);

/**
 * @swagger
 * /api/trips/active:
 *   get:
 *     summary: Get user's active trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active trip retrieved successfully
 */
router.get(
    '/active',
    authenticateToken,
    tripController.getActiveTrip.bind(tripController)
);

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get all trips for user
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trips retrieved successfully
 */
router.get(
    '/',
    authenticateToken,
    tripController.getAllTrips.bind(tripController)
);

/**
 * @swagger
 * /api/trips/user/{userId}:
 *   get:
 *     summary: Get trips for a monitored user
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trips retrieved successfully
 */
router.get(
    '/user/:userId',
    authenticateToken,
    tripController.getTripsByUserId.bind(tripController)
);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Get trip by ID
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip retrieved successfully
 */
router.get(
    '/:id',
    authenticateToken,
    tripController.getTripById.bind(tripController)
);

/**
 * @swagger
 * /api/trips/{id}/status:
 *   patch:
 *     summary: Update trip status
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Trip status updated successfully
 */
router.patch(
    '/:id/status',
    authenticateToken,
    validate(UpdateTripStatusSchema),
    tripController.updateTripStatus.bind(tripController)
);

/**
 * @swagger
 * /api/trips/{id}/stops:
 *   post:
 *     summary: Add a stop to trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sequence
 *               - latitude
 *               - longitude
 *             properties:
 *               sequence:
 *                 type: number
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stop added successfully
 */
router.post(
    '/:id/stops',
    authenticateToken,
    validate(AddStopSchema),
    tripController.addStop.bind(tripController)
);

/**
 * @swagger
 * /api/trips/{id}/stops/{stopId}/arrive:
 *   patch:
 *     summary: Mark stop as arrived
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stop marked as arrived
 */
router.patch(
    '/:id/stops/:stopId/arrive',
    authenticateToken,
    tripController.markStopArrived.bind(tripController)
);

export default router;
