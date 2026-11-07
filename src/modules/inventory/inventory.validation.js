
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID");

// Create inventory variant
export const createInventorySchema = z.object({
  body: z
    .object({
      product: objectIdSchema,

      size: z.string().trim().min(1).max(30),

      color: z.string().trim().min(1).max(50),

      sku: z
        .string()
        .trim()
        .min(3)
        .max(50)
        .regex(
          /^[a-zA-Z0-9-]+$/,
          "SKU can contain letters, numbers and hyphens only"
        ),

      stock: z.number().int().min(0),

      lowStockThreshold: z.number().int().min(0).optional(),

      isActive: z.boolean().optional(),
    })
    .strict(),
});

// Update inventory
export const updateInventorySchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: z
    .object({
      stock: z.number().int().min(0).optional(),

      lowStockThreshold: z.number().int().min(0).optional(),

      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});
