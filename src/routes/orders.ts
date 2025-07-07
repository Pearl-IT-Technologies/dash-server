// routes/orders.ts
import express from "express";
import {
	getOrders,
	getMyOrders,
	getOrder,
	createOrder,
	updateOrderStatus,
	cancelOrder,
	verifyPayment,
  updateOrder,
} from "../controllers/orderController";
import { protect, restrictTo } from "../middleware/auth";

const router = express.Router();

router.post("/", createOrder);
router.post("/verify-payment", verifyPayment);

// All routes are protected
router.use(protect);

// Customer routes
router.get("/my", getMyOrders);
router.get("/:id", getOrder);
router.patch("/:id/cancel", cancelOrder);

// Admin/Staff routes
router.get("/", restrictTo("admin", "storekeeper", "salesperson"), getOrders);
router.patch("/:id", restrictTo("admin", "storekeeper", "salesperson"), updateOrder);
router.patch("/:id/status", restrictTo("admin", "storekeeper", "salesperson"), updateOrderStatus);

export default router;
