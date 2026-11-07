
import mongoose from "mongoose";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { admin } from "better-auth/plugins";

import { env } from "./env.js";

let authInstance = null;

export const initializeAuth = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB must be connected before initializing Better Auth");
  }

  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) {
    throw new Error("Better Auth environment variables are missing");
  }

  const client = mongoose.connection.getClient();
  const db = mongoose.connection.db;

  authInstance = betterAuth({
    appName: "Rehclub",

    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/v1/auth",

    secret: env.BETTER_AUTH_SECRET,

    database: mongodbAdapter(db, {
      client,
    }),

    trustedOrigins: [
      ...env.FRONTEND_URLS,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },

    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],

    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
    },
  });

  return authInstance;
};

export const getAuth = () => {
  if (!authInstance) {
    throw new Error("Better Auth has not been initialized");
  }

  return authInstance;
};
