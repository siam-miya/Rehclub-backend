
import { Router } from "express";

import {
  createOrder,
  trackOrder,
} from "./order.controller.js";

import { validate } from "../../middlewares/validate.js";

import { optionalAuthenticate } from "../../middlewares/auth.middleware.js";

import { createOrderSchema } from "./order.validation.js";

const router = Router();

// Guest + Logged-in Customer Checkout
router.post(
  "/",
  optionalAuthenticate,
  validate(createOrderSchema),
  createOrder
);

// Customer Order Tracking
router.get(
  "/track/:orderNumber",
  trackOrder
);

export default router;