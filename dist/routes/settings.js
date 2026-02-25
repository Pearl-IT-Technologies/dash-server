"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.protect);
router
    .route("/exchange-rate")
    .get((0, auth_1.restrictTo)("admin", "storekeeper"), settingsController_1.getExchangeRate)
    .post((0, auth_1.restrictTo)("admin", "storekeeper"), settingsController_1.updateExchangeRate);
exports.default = router;
//# sourceMappingURL=settings.js.map