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
router.get("/", restrictTo("admin", "storekeeper", "salesrep"), getOrders);
router.patch("/:id", restrictTo("admin", "storekeeper", "salesrep"), updateOrder);
router.patch("/:id/status", restrictTo("admin", "storekeeper", "salesrep"), updateOrderStatus);

export default router;
