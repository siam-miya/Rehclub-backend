
import http from "node:http";
import mongoose from "mongoose";

import app from "./app.js";
import { env } from "./config/env.js";
import connectDB from "./database/connectDB.js";
import logger from "./utils/logger.js";
import { initializeAuth } from "./config/auth.js";

const startServer = async () => {
  try {
    // Connect MongoDB first
    await connectDB();

    // Initialize Better Auth after database connection
    initializeAuth();

    // Create HTTP server
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`Rehclub API running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });

    let isShuttingDown = false;

    const shutdown = async (signal) => {
      if (isShuttingDown) return;

      isShuttingDown = true;

      logger.info(`${signal} received. Shutting down...`);

      server.close(async (error) => {
        if (error) {
          logger.error(error, "HTTP server shutdown failed");
          process.exitCode = 1;
        }

        try {
          await mongoose.disconnect();
          logger.info("MongoDB disconnected");
        } catch (dbError) {
          logger.error(dbError, "Database shutdown failed");
          process.exitCode = 1;
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    logger.fatal(error, "Failed to start Rehclub API");

    process.exitCode = 1;
  }
};

startServer();
