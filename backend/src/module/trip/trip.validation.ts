import { z } from 'zod';

// Validation schema for trip stop
export const TripStopSchema = z.object({
  sequence: z.number().int().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

// Validation schema for creating a trip
export const CreateTripSchema = z.object({
  name: z.string().optional(),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  startAddress: z.string().optional(),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  endAddress: z.string().optional(),
  stops: z.array(TripStopSchema).optional().default([]),
});

// Validation schema for updating trip status
export const UpdateTripStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']),
});

// Validation schema for adding a stop
export const AddStopSchema = z.object({
  sequence: z.number().int().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

// Export types
export type CreateTripInput = z.infer<typeof CreateTripSchema>;
export type UpdateTripStatusInput = z.infer<typeof UpdateTripStatusSchema>;
export type AddStopInput = z.infer<typeof AddStopSchema>;
export type TripStopInput = z.infer<typeof TripStopSchema>;
