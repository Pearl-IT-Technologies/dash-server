import express from "express";
import { protect, restrictTo } from "../middleware/auth";
import {
	bulkUpdateUsers,
	createUser,
	deleteUserById,
	getAllUsers,
	getLoginHistory,
	getUserStats,
	getUserById,
	searchUsers,
	updateUserById,
} from "../controllers/userController";

const router = express.Router();

// All routes are protected and admin-only
router.use(protect);

router.get("/login-history", getLoginHistory);

router.use(restrictTo("admin"));

router.get("/stats", getUserStats);
router.get("/search", searchUsers);
router.put("/bulk-update", bulkUpdateUsers);
router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUserById);
router.delete("/:id", deleteUserById);

export default router;
