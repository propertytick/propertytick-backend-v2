require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { seedAdmin } = require('./utils/seedAdmin');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedAdmin(); // Auto-create admin if missing

    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`🚀 PropertyTick API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.warn(`${signal} received. Shutting down...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
