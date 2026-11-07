
import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),

  parent: z.string().nullable().optional(),

  description: z.string().max(1000).optional(),

  image: z.string().url().optional(),

  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),

  description: z.string().max(1000).optional(),

  image: z.string().url().optional(),

  sortOrder: z.number().int().min(0).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" }
);
