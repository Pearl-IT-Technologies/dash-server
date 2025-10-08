"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginHistory = void 0;
const mongoose_1 = require("mongoose");
const loginHistorySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    success: { type: Boolean, default: true },
    method: { type: String, default: "password" },
    location: {
        city: String,
        region: String,
        country: String,
    },
});
exports.LoginHistory = (0, mongoose_1.model)("LoginHistory", loginHistorySchema);
//# sourceMappingURL=LoginHistory.js.map