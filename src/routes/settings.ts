import express from "express";
import { getExchangeRate, updateExchangeRate } from "../controllers/settingsController";
import { protect, restrictTo } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Exchange rate routes - only admin and storekeeper can access
router
	.route("/exchange-rate")
	.get(restrictTo("admin", "storekeeper"), getExchangeRate)
	.post(restrictTo("admin", "storekeeper"), updateExchangeRate);

export default router;