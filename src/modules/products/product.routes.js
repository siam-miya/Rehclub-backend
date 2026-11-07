
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

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/:slug", getProduct);

// Admin routes
// Authentication will be added before production deployment.
router.post("/", validate(createProductSchema), postProduct);
router.patch("/:id", validate(updateProductSchema), patchProduct);
router.delete("/:id", removeProduct);

export default router;
