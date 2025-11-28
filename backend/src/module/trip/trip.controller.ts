import { Request, Response, NextFunction } from 'express';
import { tripService } from './trip.service';
import {
    CreateTripInput,
    UpdateTripStatusInput,
    AddStopInput,
} from './trip.validation';

export class TripController {
    /**
     * Create a new trip
     * @route POST /api/trips
     */
    async createTrip(
        req: Request<{}, {}, CreateTripInput>,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            console.log('🚗 [create-trip] Creating trip for user:', userId);

            const trip = await tripService.createTrip(userId, req.body);

            res.status(201).json({
                success: true,
                message: 'Trip created successfully',
                data: trip,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's active trip
     * @route GET /api/trips/active
     */
    async getActiveTrip(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const trip = await tripService.getActiveTrip(userId);

            res.status(200).json({
                success: true,
                data: trip,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all trips for user
     * @route GET /api/trips
     */
    async getAllTrips(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const trips = await tripService.getAllTrips(userId);

            res.status(200).json({
                success: true,
                data: trips,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get trips for a monitored user
     * @route GET /api/trips/user/:userId
     */
    async getTripsByUserId(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const guardianId = (req as any).user.userId;
            const { userId } = req.params;

            const trips = await tripService.getTripsByUserId(userId, guardianId);

            res.status(200).json({
                success: true,
                data: trips,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get trip by ID
     * @route GET /api/trips/:id
     */
    async getTripById(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;

            const trip = await tripService.getTripById(id, userId);

            res.status(200).json({
                success: true,
                data: trip,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update trip status
     * @route PATCH /api/trips/:id/status
     */
    async updateTripStatus(
        req: Request<{ id: string }, {}, UpdateTripStatusInput>,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;

            const trip = await tripService.updateTripStatus(id, userId, req.body);

            res.status(200).json({
                success: true,
                message: 'Trip status updated successfully',
                data: trip,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add stop to trip
     * @route POST /api/trips/:id/stops
     */
    async addStop(
        req: Request<{ id: string }, {}, AddStopInput>,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;

            const stop = await tripService.addStop(id, userId, req.body);

            res.status(201).json({
                success: true,
                message: 'Stop added successfully',
                data: stop,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark stop as arrived
     * @route PATCH /api/trips/:id/stops/:stopId/arrive
     */
    async markStopArrived(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const { id, stopId } = req.params;

            const stop = await tripService.markStopArrived(id, stopId, userId);

            res.status(200).json({
                success: true,
                message: 'Stop marked as arrived',
                data: stop,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const tripController = new TripController();
