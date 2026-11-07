
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Get logged-in customer profile
router.get("/me", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Account information fetched successfully",
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
    },
  });
});

export default router;
