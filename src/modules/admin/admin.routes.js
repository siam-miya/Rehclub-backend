
import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.js";

import {
  getAllOrders,
  cancelOrder,
  deliverOrder,
  updateOrderStatus,
} from "../orders/order.controller.js";

import {
  orderListQuerySchema,
  orderActionSchema,
  orderStatusUpdateSchema,
} from "../orders/order.validation.js";
import { commitInventory } from "../inventory/inventory.service.js";

const router = Router();

// Admin Dashboard
router.get(
  "/dashboard",
  authenticate,
  requireAdmin,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to Rehclub Admin Dashboard",
      user: req.user,
    });
  }
);

// Admin Profile
router.get(
  "/me",
  authenticate,
  requireAdmin,
  (req, res) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  }
);

// Get All Orders
router.get(
  "/orders",
  authenticate,
  requireAdmin,
  validate(orderListQuerySchema),
  getAllOrders
);

// Cancel Order
router.patch(
  "/orders/:orderId/cancel",
  authenticate,
  requireAdmin,
  validate(orderActionSchema),
  cancelOrder
);

// Deliver Order
router.patch(
  "/orders/:orderId/deliver",
  authenticate,
  requireAdmin,
  validate(orderActionSchema),
  deliverOrder
);

// Update Order Status
router.patch(
  "/orders/:orderId/status",
  authenticate,
  requireAdmin,
  validate(orderStatusUpdateSchema),
  updateOrderStatus
);

export default router;









