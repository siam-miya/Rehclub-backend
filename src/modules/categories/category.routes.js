import { Router } from "express";

import {
  getCategories,
  getCategory,
  postCategory,
  patchCategory,
  removeCategory,
} from "./category.controller.js";

import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation.js";

import { validate } from "../../middlewares/validate.js";

const router = Router();

// Public routes
router.get("/", getCategories);
router.get("/path/*path", getCategory);

// Admin routes - authentication will be added next
router.post("/", validate(createCategorySchema), postCategory);
router.patch("/:id", validate(updateCategorySchema), patchCategory);
router.delete("/:id", removeCategory);

export default router;
