
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import Order from "./order.model.js";
import Product from "../products/product.model.js";
import Inventory from "../inventory/inventory.model.js";

import { reserveInventory } from "../inventory/inventory.service.js";

// Generate Unique Order Number (Bangladesh Time)
const generateOrderNumber = () => {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const dateMap = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value])
  );

  const date = `${dateMap.year}${dateMap.month}${dateMap.day}`;
  const random = randomBytes(8).toString("hex").toUpperCase();

  return `RH-${date}-${random}`;
};

// Custom Error
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Validate MongoDB ObjectId
const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(`Invalid ${fieldName}.`, 400);
  }
};

// Delivery Charge
const getDeliveryCharge = (deliveryArea) => {
  const charge =
    deliveryArea === "inside-dhaka"
      ? Number(process.env.DELIVERY_CHARGE_INSIDE_DHAKA)
      : Number(process.env.DELIVERY_CHARGE_OUTSIDE_DHAKA);

  if (!Number.isSafeInteger(charge) || charge < 0) {
    throw createError("Invalid delivery charge configuration.", 500);
  }

  return charge;
};

// Merge Duplicate Cart Variants
const mergeOrderItems = (items) => {
  const itemMap = new Map();

  for (const item of items) {
    const { productId, inventoryId, quantity } = item;

    validateObjectId(productId, "Product ID");
    validateObjectId(inventoryId, "Inventory ID");

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw createError("Invalid product quantity. Maximum is 99.", 400);
    }

    const existing = itemMap.get(inventoryId);

    if (existing) {
      if (existing.productId !== productId) {
        throw createError(
          "Invalid product and inventory combination.",
          400
        );
      }

      existing.quantity += quantity;

      if (existing.quantity > 99) {
        throw createError(
          "Maximum quantity per variant is 99.",
          400
        );
      }
    } else {
      itemMap.set(inventoryId, {
        productId,
        inventoryId,
        quantity,
      });
    }
  }

  return Array.from(itemMap.values());
};

// Create Order Attempt
const createOrderAttempt = async (payload, customerId, orderNumber) => {
  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const {
        customerInfo,
        shippingAddress,
        customerNote = "",
      } = payload;

      const orderItems = [];
      let subtotal = 0;

      // Process Each Unique Variant
      for (const item of payload.mergedItems) {
        const { productId, inventoryId, quantity } = item;

        // Find Active Product
        const product = await Product.findOne({
          _id: productId,
          status: "active",
        }).session(session);

        if (!product) {
          throw createError(
            "Product not found or unavailable.",
            404
          );
        }

        // Verify Inventory Belongs To Product
        const existingInventory = await Inventory.findOne({
          _id: inventoryId,
          product: product._id,
          isActive: true,
        }).session(session);

        if (!existingInventory) {
          throw createError(
            "Product variant not found or unavailable.",
            404
          );
        }

        // Reserve Stock Atomically
        const inventory = await reserveInventory({
          inventoryId,
          quantity,
          session,
        });

        // Server-side Price (Integer BDT)
        const price = Number(product.price);

        if (!Number.isSafeInteger(price) || price < 0) {
          throw createError(
            `Invalid price for ${product.name}.`,
            500
          );
        }

        const itemSubtotal = price * quantity;

        if (!Number.isSafeInteger(itemSubtotal)) {
          throw createError("Product subtotal is too large.", 400);
        }

        subtotal += itemSubtotal;

        if (!Number.isSafeInteger(subtotal)) {
          throw createError("Order subtotal is too large.", 400);
        }

        // Product Snapshot
        orderItems.push({
          product: product._id,
          inventory: inventory._id,

          name: product.name,
          slug: product.slug,
          image: product.image,

          sku: inventory.sku,
          size: inventory.size,
          color: inventory.color,

          quantity,
          price,
          subtotal: itemSubtotal,
        });
      }

      // Server-side Pricing
      const discount = 0;
      const tax = 0;

      const deliveryCharge = getDeliveryCharge(
        shippingAddress.deliveryArea
      );

      const total = subtotal - discount + deliveryCharge + tax;

      if (!Number.isSafeInteger(total) || total < 0) {
        throw createError("Invalid order total.", 400);
      }

      // COD Order Data
      const orderData = {
        orderNumber,

        customer: customerId,

        customerInfo,

        items: orderItems,

        shippingAddress,

        pricing: {
          subtotal,
          discount,
          deliveryCharge,
          tax,
          total,
        },

        payment: {
          method: "COD",
          status: "PENDING",
        },

        status: "PENDING",

        // COD orders do not expire automatically
        reservationStatus: "ACTIVE",
        reservationExpiresAt: null,

        statusHistory: [
          {
            status: "PENDING",
            note: "COD order placed successfully.",
          },
        ],

        customerNote,
      };

      // Save Order Inside Transaction
      const [order] = await Order.create(
        [orderData],
        { session }
      );

      createdOrder = order;
    });

    return createdOrder;
  } finally {
    await session.endSession();
  }
};

// Create Order With Duplicate Order Number Retry
export const createOrder = async (payload, customerId = null) => {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw createError("Your cart is empty.", 400);
  }

  // Enforce COD at service level
  if (payload.payment?.method !== "COD") {
    throw createError(
      "Currently only Cash on Delivery is available.",
      400
    );
  }

  // Validate Better Auth Customer ID
  if (
    customerId !== null &&
    (typeof customerId !== "string" || !customerId.trim())
  ) {
    throw createError("Invalid customer ID.", 400);
  }

  const mergedItems = mergeOrderItems(payload.items);

  // Keep Original Payload Unchanged
  const orderPayload = {
    ...payload,
    mergedItems,
  };

  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const orderNumber = generateOrderNumber();

    try {
      return await createOrderAttempt(
        orderPayload,
        customerId,
        orderNumber
      );
    } catch (error) {
      const isDuplicateOrderNumber =
        error?.code === 11000 &&
        (
          error?.keyPattern?.orderNumber === 1 ||
          error?.keyValue?.orderNumber !== undefined
        );

      if (
        !isDuplicateOrderNumber ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error;
      }
    }
  }

  throw createError(
    "Unable to generate a unique order number.",
    500
  );
};

// Get Order By ID
export const getOrderById = async (orderId) => {
  validateObjectId(orderId, "Order ID");

  const order = await Order.findById(orderId)
    .populate("items.product", "name slug image")
    .lean();

  if (!order) {
    throw createError("Order not found.", 404);
  }

  return order;
};

// Get Order By Order Number
export const getOrderByNumber = async (orderNumber) => {
  const order = await Order.findOne({
    orderNumber,
  }).lean();

  if (!order) {
    throw createError("Order not found.", 404);
  }

  return order;
};

// Get All Orders (Admin)
export const getAllOrders = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);

  const limit = Math.min(
    100,
    Math.max(1, Number(query.limit) || 20)
  );

  const skip = (page - 1) * limit;

  const filter = {};

  // Filter By Status
  if (query.status) {
    filter.status = query.status;
  }

  // Search Orders
  if (query.search) {
    const search = query.search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      {
        orderNumber: {
          $regex: search,
          $options: "i",
        },
      },
      {
        "customerInfo.name": {
          $regex: search,
          $options: "i",
        },
      },
      {
        "customerInfo.phone": {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  return {
    orders,

    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      limit,

      hasNextPage: page * limit < totalOrders,
      hasPreviousPage: page > 1,
    },
  };
};
