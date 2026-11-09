
import { Router } from "express";

import {
  getProducts,
  getProduct,
  postProduct,
  patchProduct,
  removeProduct,
} from "./product.controller.js";

import {
  createProductSchema,
  updateProductSchema,
} from "./product.validation.js";

import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/authorize.middleware.js";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/:slug", getProduct);

// Admin protected routes
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(createProductSchema),
  postProduct
);

router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  patchProduct
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  removeProduct
);

export default router;
