import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const app = express();

// Configure express for production
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Process error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

(async () => {
  try {
    log('Starting application initialization...');
    
    const server = await registerRoutes(app);
    log('Routes registered successfully');

    // Enhanced error handler for production
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message || 'Internal Server Error';

      // Log error details for debugging
      console.error('Error occurred:', {
        status,
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      res.status(status).json({ message });

      // Don't throw in production to prevent crashes
      if (process.env.NODE_ENV !== 'production') {
        throw err;
      }
    });

    // Setup environment-specific middleware
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
      log('Setting up development environment with Vite');
      await setupVite(app, server);
    } else {
      log('Setting up production environment with static files');
      serveStatic(app);
    }

    // Health check endpoint for deployment monitoring
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
      });
    });

    // Development: Use port 5000 for API server
    // Production: Use environment PORT or default to 5000
    const port = isProduction 
      ? parseInt(process.env.PORT || '5000', 10)
      : 5000;
    
    server.listen({
      port,
      host: "localhost",
    }, () => {
      log(`Server successfully started on port ${port} in ${process.env.NODE_ENV} mode`);
      if (!isProduction) {
        log(`Frontend development server available at: http://localhost:3000`);
        log(`API server available at: http://localhost:${port}`);
      }
      log('Application initialization completed successfully');
      
      // Signal that the app is ready (helpful for deployment systems)
      if (process.send) {
        process.send('ready');
      }
    });

    // Handle server startup errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
})();
