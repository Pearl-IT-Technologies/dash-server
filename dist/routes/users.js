"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.get("/login-history", userController_1.getLoginHistory);
router.use((0, auth_1.restrictTo)("admin"));
router.get("/stats", userController_1.getUserStats);
router.get("/search", userController_1.searchUsers);
router.put("/bulk-update", userController_1.bulkUpdateUsers);
router.post("/", userController_1.createUser);
router.get("/", userController_1.getAllUsers);
router.get("/:id", userController_1.getUserById);
router.put("/:id", userController_1.updateUserById);
router.delete("/:id", userController_1.deleteUserById);
exports.default = router;
//# sourceMappingURL=users.js.map