import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        // Log validation errors for debugging
        console.log('❌ Validation failed:', JSON.stringify({ body: req.body, errors }, null, 2));
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
      }
      next(error);
    }
  };
};
