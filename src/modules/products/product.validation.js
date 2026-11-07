
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID");

const productBaseSchema = z.object({
  name: z.string().trim().min(2).max(150),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only"
    ),

  description: z.string().trim().min(10),

  shortDescription: z.string().trim().max(300).optional(),

  category: objectIdSchema,

  price: z.number().finite().nonnegative(),

  oldPrice: z.number().finite().positive().nullable().optional(),

  image: z.string().trim().url(),

  images: z.array(z.string().trim().url()).max(20).optional(),

  brand: z.string().trim().max(100).optional(),

  sections: z
    .object({
      newArrival: z.boolean().optional(),
      bestSelling: z.boolean().optional(),
      flashSale: z.boolean().optional(),
    })
    .optional(),

  isFeatured: z.boolean().optional(),

  status: z.enum(["draft", "active", "archived"]).optional(),

  metaTitle: z.string().trim().max(70).optional(),

  metaDescription: z.string().trim().max(160).optional(),
}).strict();

export const createProductSchema = z.object({
  body: productBaseSchema.superRefine((data, ctx) => {
    if (data.oldPrice !== undefined && data.oldPrice !== null) {
      if (data.oldPrice <= data.price) {
        ctx.addIssue({
          code: "custom",
          path: ["oldPrice"],
          message: "Old price must be greater than current price",
        });
      }
    }
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),

  body: productBaseSchema
    .partial()
    .superRefine((data, ctx) => {
      if (
        data.oldPrice !== undefined &&
        data.oldPrice !== null &&
        data.price !== undefined &&
        data.oldPrice <= data.price
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["oldPrice"],
          message: "Old price must be greater than current price",
        });
      }
    })
    .strict(),
});
