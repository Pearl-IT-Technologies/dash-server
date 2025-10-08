"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get("/track/:orderNumber", orderController_1.trackOrderPublic);
router.post("/", orderController_1.createOrder);
router.post("/verify-payment", orderController_1.verifyPayment);
router.use(auth_1.protect);
router.get("/my", orderController_1.getMyOrders);
router.get("/:id", orderController_1.getOrder);
router.patch("/:id/cancel", orderController_1.cancelOrder);
router.get("/", (0, auth_1.restrictTo)("admin", "storekeeper", "salesrep"), orderController_1.getOrders);
router.patch("/:id", (0, auth_1.restrictTo)("admin", "storekeeper", "salesrep"), orderController_1.updateOrder);
router.patch("/:id/status", (0, auth_1.restrictTo)("admin", "storekeeper", "salesrep"), orderController_1.updateOrderStatus);
exports.default = router;
//# sourceMappingURL=orders.js.map