import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlertMate API Documentation',
      version: '1.0.0',
      description: 'API documentation for AlertMate - AI-powered personal safety companion',
      contact: {
        name: 'AlertMate Team',
        email: 'support@alertmate.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.alertmate.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
    },
    security: [],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration endpoints',
      },
      {
        name: 'Users',
        description: 'User profile management endpoints',
      },
      {
        name: 'Guardians',
        description: 'Guardian connection and monitoring endpoints',
      },
      {
        name: 'Health',
        description: 'Health stats and monitoring endpoints',
      },
      {
        name: 'Location',
        description: 'Location tracking endpoints',
      },
    ],
  },
  apis: [
    './src/module/**/*.ts',
    './src/module/**/*.route.ts',
    './src/module/**/*.validation.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AlertMate API Documentation',
  }));

  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};
