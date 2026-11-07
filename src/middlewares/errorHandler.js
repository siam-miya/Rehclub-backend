
import { env } from "../config/env.js";

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);

  error.statusCode = 404;

  next(error);
};

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;

  let message = error.message || "Internal Server Error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate resource";
  }

  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
  }

  if (res.headersSent) {
    return next(error);
  }

  const response = {
    success: false,
    message:
      env.NODE_ENV === "production" && statusCode >= 500
        ? "Internal Server Error"
        : message,
  };

  if (env.NODE_ENV !== "production" && statusCode >= 500) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

export { notFoundHandler, errorHandler };
