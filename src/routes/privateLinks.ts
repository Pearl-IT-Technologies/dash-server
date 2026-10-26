import express from "express";
import rateLimit from "express-rate-limit";
import {
	createPrivateLink,
	getPrivateLinks,
	getPrivateLink,
	updatePrivateLink,
	revokePrivateLink,
	resolvePrivateLink,
	getPrivateLinkUrl,
} from "../controllers/privateLinkController";
import { protect, restrictTo } from "../middleware/auth";

const router = express.Router();

// Strict limiter for the public resolve endpoint (the global limiter skips GETs)
const resolveLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: Number(process.env.PRIVATE_LINK_RESOLVE_LIMIT) || 30,
	message: { message: "Too many requests, please try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Public route
router.get("/resolve/:token", resolveLimiter, resolvePrivateLink);

// Staff only (customers excluded)
router.use(protect, restrictTo("admin", "salesrep", "storekeeper"));

router.route("/").get(getPrivateLinks).post(createPrivateLink);
router.route("/:id").get(getPrivateLink).patch(updatePrivateLink);
router.post("/:id/revoke", revokePrivateLink);
router.get("/:id/url", getPrivateLinkUrl);

export default router;
