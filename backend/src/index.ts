import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { setupSwagger } from './config/swagger';
import authRoutes from './module/auth/auth.route';
import bubbleRoutes from './routes/bubbles';
import trackingRoutes from './module/tracking/tracking.route';
import tripRoutes from './module/trip/trip.route';
import tripShareRoutes from './module/trip-share/trip-share.route';
import analyticsRoutes from './module/analytics/analytics.route';
import guardianRoutes from './module/guardian/guardian.route';
import sosRoutes from './module/sos/sos.route';
import crowdShieldRoutes from './module/crowd-shield/crowd-shield.route';
import medicalRoutes from './routes/medical.routes';
import { emailService } from './services/email.service';
import { socketService } from './services/socket.service';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket
socketService.initialize(httpServer);

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (important for ngrok)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Setup Swagger documentation
setupSwagger(app);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AlertMate Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bubbles', bubbleRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/trips', tripShareRoutes);
app.use('/api/trips', analyticsRoutes); // Mounts under /api/trips to match paths like /api/trips/:tripId/analytics
app.use('/api/guardians', guardianRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/crowd-shield', crowdShieldRoutes);
app.use('/api/medical', medicalRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server (use httpServer instead of app)
httpServer.listen(PORT, async () => {
  console.log('\n🚀 ===============================================');
  console.log(`🏥 AlertMate Backend Server`);
  console.log(`===============================================`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket: Enabled`);
  console.log(`===============================================`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`📄 API JSON: http://localhost:${PORT}/api-docs.json`);
  console.log(`===============================================`);

  // Test email service connection
  console.log('📧 Testing email service...');
  const emailConnected = await emailService.testConnection();
  if (emailConnected) {
    console.log('✅ Email service ready');
  } else {
    console.log('⚠️  Email service not configured (emails will be skipped)');
  }

  console.log(`===============================================\n`);
});

export default app;
