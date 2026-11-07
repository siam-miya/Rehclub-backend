import { Router } from "express";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  requireAdmin,
} from "../../middlewares/authorize.middleware.js";

const router = Router();

// Admin dashboard
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

// Admin profile test
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

export default router;