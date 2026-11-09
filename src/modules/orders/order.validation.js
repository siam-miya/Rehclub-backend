
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+?8801|01)[3-9]\d{8}$/,
    "Invalid Bangladesh phone number"
  );

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(254)
  .nullable()
  .optional();

// Order Item Validation
const orderItemSchema = z
  .object({
    productId: objectIdSchema,
    inventoryId: objectIdSchema,
    quantity: z
      .number()
      .int("Quantity must be an integer")
      .min(1, "Minimum quantity is 1")
      .max(99, "Maximum quantity is 99"),
  })
  .strict();

// Customer Information
const customerInfoSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: phoneSchema,
    email: emailSchema,
  })
  .strict();

// Shipping Address
const shippingAddressSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    phone: phoneSchema,
    email: emailSchema,
    division: z.string().trim().min(2).max(100),
    district: z.string().trim().min(2).max(100),
    area: z.string().trim().min(2).max(100),
    address: z.string().trim().min(5).max(500),
    postalCode: z.string().trim().max(20).nullable().optional(),
    deliveryArea: z.enum(["inside-dhaka", "outside-dhaka"]),
  })
  .strict();

// COD Only Payment Validation
const paymentSchema = z
  .object({
    method: z.literal("COD", {
      error: "Currently only Cash on Delivery is available.",
    }),
  })
  .strict();

// Create Order Validation
export const createOrderSchema = z
  .object({
    body: z
      .object({
        items: z
          .array(orderItemSchema)
          .min(1, "Order must contain at least one item")
          .max(50, "Maximum 50 different items allowed"),

        customerInfo: customerInfoSchema,

        shippingAddress: shippingAddressSchema,

        payment: paymentSchema,

        customerNote: z.string().trim().max(1000).optional().default(""),
      })
      .strict(),
  })
  .strict();

// Order ID Validation
export const orderIdSchema = z
  .object({
    params: z
      .object({
        orderId: objectIdSchema,
      })
      .strict(),
  })
  .strict();

// Order Action Validation (Cancel / Deliver)
export const orderActionSchema = z
  .object({
    params: z
      .object({
        orderId: objectIdSchema,
      })
      .strict(),

    body: z
      .object({
        note: z.string().trim().max(500).optional().default(""),
      })
      .strict(),
  })
  .strict();

// Order List Query Validation
export const orderListQuerySchema = z
  .object({
    query: z
      .object({
        page: z.coerce.number().int().min(1).default(1),

        limit: z.coerce.number().int().min(1).max(100).default(20),

        status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "RETURNED",
          ])
          .optional(),

        search: z.string().trim().max(100).optional(),
      })
      .strict(),
  })
  .strict();

// Order Status Update Validation (Admin)
export const orderStatusUpdateSchema = z
  .object({
    params: z
      .object({
        orderId: objectIdSchema,
      })
      .strict(),

    body: z
      .object({
        status: z.enum([
          "CONFIRMED",
          "PROCESSING",
          "SHIPPED",
        ]),

        note: z.string().trim().max(500).optional().default(""),
      })
      .strict(),
  })
  .strict();
