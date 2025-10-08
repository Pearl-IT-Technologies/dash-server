"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SettingSchema = new mongoose_1.default.Schema({
    usdToNgnRate: {
        type: Number,
        required: true,
        default: 1650,
        min: [1, "Exchange rate must be greater than 0"],
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});
SettingSchema.index({}, { unique: true });
const Setting = mongoose_1.default.model("Setting", SettingSchema);
exports.default = Setting;
//# sourceMappingURL=Setting.js.map