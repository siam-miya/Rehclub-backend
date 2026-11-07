
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  FRONTEND_URLS: z.string().min(1),

  MONGODB_URI: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().optional(),

  BETTER_AUTH_URL: z.string().url().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = Object.freeze({
  ...result.data,
  FRONTEND_URLS: result.data.FRONTEND_URLS
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
});
