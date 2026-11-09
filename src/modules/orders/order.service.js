
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import Order from "./order.model.js";
import Product from "../products/product.model.js";
import Inventory from "../inventory/inventory.model.js";

import {
  reserveInventory,
  releaseInventory,
  commitInventory,
} from "../inventory/inventory.service.js";

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

    const inventoryKey = String(inventoryId);
    const productKey = String(productId);

    const existing = itemMap.get(inventoryKey);

    if (existing) {
      if (String(existing.productId) !== productKey) {
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
      itemMap.set(inventoryKey, {
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

      if (!isDuplicateOrderNumber || attempt === MAX_ATTEMPTS) {
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

  if (query.status) {
    filter.status = query.status;
  }

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

// Release All Reserved Inventory For An Order
const releaseOrderInventory = async (order, session) => {
  for (const item of order.items) {
    await releaseInventory({
      inventoryId: item.inventory,
      quantity: item.quantity,
      session,
    });
  }
};

// Commit All Reserved Inventory For An Order
const commitOrderInventory = async (order, session) => {
  for (const item of order.items) {
    await commitInventory({
      inventoryId: item.inventory,
      quantity: item.quantity,
      session,
    });
  }
};

// Cancel Order (Admin)
export const cancelOrder = async ({
  orderId,
  note = "Order cancelled",
}) => {
  validateObjectId(orderId, "Order ID");

  const session = await mongoose.startSession();

  try {
    let cancelledOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createError("Order not found.", 404);
      }

      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        throw createError(
          `Cannot cancel an order with ${order.status} status.`,
          409
        );
      }

      if (order.payment.status === "PAID") {
        throw createError(
          "This order is already paid and cannot be cancelled.",
          409
        );
      }

      if (order.reservationStatus !== "ACTIVE") {
        throw createError(
          "Order inventory reservation is not active.",
          409
        );
      }

      await releaseOrderInventory(order, session);

      const now = new Date();

      order.status = "CANCELLED";
      order.reservationStatus = "RELEASED";
      order.reservationExpiresAt = null;
      order.cancelledAt = now;

      order.statusHistory.push({
        status: "CANCELLED",
        note: String(note).slice(0, 500),
        changedAt: now,
      });

      await order.save({ session });

      cancelledOrder = order;
    });

    return cancelledOrder;
  } finally {
    await session.endSession();
  }
};

// Deliver Order (Admin)
export const deliverOrder = async ({
  orderId,
  note = "Order delivered",
}) => {
  validateObjectId(orderId, "Order ID");

  const session = await mongoose.startSession();

  try {
    let deliveredOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createError("Order not found.", 404);
      }

      if (order.status !== "SHIPPED") {
        throw createError(
          "Only shipped orders can be marked as delivered.",
          409
        );
      }

      if (order.payment.method !== "COD") {
        throw createError("Unsupported payment method.", 409);
      }

      if (order.reservationStatus !== "ACTIVE") {
        throw createError(
          "Order inventory reservation is not active.",
          409
        );
      }

      if (order.payment.status === "PAID") {
        throw createError(
          "Order payment has already been completed.",
          409
        );
      }

      await commitOrderInventory(order, session);

      const now = new Date();

      order.status = "DELIVERED";
      order.reservationStatus = "COMMITTED";
      order.reservationExpiresAt = null;
      order.deliveredAt = now;

      order.payment.status = "PAID";
      order.payment.paidAt = now;

      order.statusHistory.push({
        status: "DELIVERED",
        note: String(note).slice(0, 500),
        changedAt: now,
      });

      await order.save({ session });

      deliveredOrder = order;
    });

    return deliveredOrder;
  } finally {
    await session.endSession();
  }
};

// Allowed Order Status Transitions
const ORDER_STATUS_TRANSITIONS = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
};

// Update Order Status (Admin)
export const updateOrderStatus = async ({
  orderId,
  status,
  note = "",
}) => {
  validateObjectId(orderId, "Order ID");

  const session = await mongoose.startSession();

  try {
    let updatedOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createError("Order not found.", 404);
      }

      const expectedNextStatus =
        ORDER_STATUS_TRANSITIONS[order.status];

      if (!expectedNextStatus) {
        throw createError(
          `Cannot update an order with ${order.status} status.`,
          409
        );
      }

      if (status !== expectedNextStatus) {
        throw createError(
          `Invalid status transition. Next status must be ${expectedNextStatus}.`,
          409
        );
      }

      if (order.payment.status === "PAID") {
        throw createError(
          "Cannot update an already paid order.",
          409
        );
      }

      if (order.reservationStatus !== "ACTIVE") {
        throw createError(
          "Order inventory reservation is not active.",
          409
        );
      }

      const now = new Date();

      order.status = status;

      order.statusHistory.push({
        status,
        note: String(note).slice(0, 500),
        changedAt: now,
      });

      await order.save({ session });

      updatedOrder = order;
    });

    return updatedOrder;
  } finally {
    await session.endSession();
  }
};
