
import mongoose from "mongoose";

import Order from "./order.model.js";

import {
  releaseInventory,
  commitInventory,
} from "../inventory/inventory.service.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Validate Order ID
const validateOrderId = (orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw createError("Invalid order ID.", 400);
  }
};

// Release all reserved inventory
const releaseOrderInventory = async (order, session) => {
  for (const item of order.items) {
    await releaseInventory({
      inventoryId: item.inventory,
      quantity: item.quantity,
      session,
    });
  }
};

// Commit all reserved inventory
const commitOrderInventory = async (order, session) => {
  for (const item of order.items) {
    await commitInventory({
      inventoryId: item.inventory,
      quantity: item.quantity,
      session,
    });
  }
};

// Cancel Order
export const cancelOrder = async ({
  orderId,
  note = "Order cancelled",
}) => {
  validateOrderId(orderId);

  const session = await mongoose.startSession();

  let cancelledOrder;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createError("Order not found.", 404);
      }

      // Only pending or confirmed orders can be cancelled
      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        throw createError(
          `Cannot cancel an order with ${order.status} status.`,
          409
        );
      }

      // COD order must not already be paid
      if (order.payment.status === "PAID") {
        throw createError(
          "This order is already paid and cannot be cancelled.",
          409
        );
      }

      // Prevent duplicate inventory release
      if (order.reservationStatus !== "ACTIVE") {
        throw createError(
          "Order inventory reservation is not active.",
          409
        );
      }

      // Release reserved stock
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

// Deliver Order
export const deliverOrder = async ({
  orderId,
  note = "Order delivered",
}) => {
  validateOrderId(orderId);

  const session = await mongoose.startSession();

  let deliveredOrder;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createError("Order not found.", 404);
      }

      // Only shipped orders can be delivered
      if (order.status !== "SHIPPED") {
        throw createError(
          "Only shipped orders can be marked as delivered.",
          409
        );
      }

      // Current system supports COD only
      if (order.payment.method !== "COD") {
        throw createError(
          "Unsupported payment method.",
          409
        );
      }

      // Prevent duplicate inventory commit
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

      // Commit reserved stock
      await commitOrderInventory(order, session);

      const now = new Date();

      order.status = "DELIVERED";
      order.reservationStatus = "COMMITTED";
      order.reservationExpiresAt = null;
      order.deliveredAt = now;

      // COD payment collected on delivery
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
