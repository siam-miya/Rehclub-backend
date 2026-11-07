
import { Router } from "express";

import {
  postInventory,
  getProductInventories,
  getInventory,
  patchInventory,
  getLowStock,
} from "./inventory.controller.js";

import {
  createInventorySchema,
  updateInventorySchema,
} from "./inventory.validation.js";

import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/authorize.middleware.js";

const router = Router();

// Public: Product page needs variant availability
router.get(
  "/product/:productId",
  getProductInventories
);

// Admin only: Low stock report
router.get(
  "/low-stock",
  authenticate,
  requireAdmin,
  getLowStock
);

// Admin only: Single inventory details
router.get(
  "/:id",
  authenticate,
  requireAdmin,
  getInventory
);

// Admin only: Create inventory variant
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(createInventorySchema),
  postInventory
);

// Admin only: Update inventory
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateInventorySchema),
  patchInventory
);

export default router;
