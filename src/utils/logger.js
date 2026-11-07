
import pino from "pino";
import { env } from "../config/env.js";

const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        }
      : undefined,

  redact: {
    paths: [
      "password",
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
    ],
    censor: "[REDACTED]",
  },
});

export default logger;
