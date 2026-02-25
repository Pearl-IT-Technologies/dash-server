"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExchangeRate = exports.getExchangeRate = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const Setting_1 = __importDefault(require("../models/Setting"));
const currencyHelper_1 = require("../utils/currencyHelper");
const index_1 = require("../index");
const mongoose_1 = __importDefault(require("mongoose"));
exports.getExchangeRate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let settings = await Setting_1.default.findOne().populate("updatedBy", "firstName lastName");
    if (!settings) {
        settings = await Setting_1.default.create({
            usdToNgnRate: 1650,
        });
        await settings.populate("updatedBy", "firstName lastName");
    }
    const responseData = {
        usdToNgnRate: settings.usdToNgnRate,
        lastUpdated: settings.lastUpdated,
        updatedBy: settings.updatedBy && typeof settings.updatedBy === 'object' && 'firstName' in settings.updatedBy && 'lastName' in settings.updatedBy
            ? `${settings.updatedBy.firstName} ${settings.updatedBy.lastName}`
            : null,
    };
    res.status(200).json({
        success: true,
        settings: responseData,
    });
});
exports.updateExchangeRate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { usdToNgnRate } = req.body;
    if (!usdToNgnRate || usdToNgnRate <= 0) {
        throw new AppError_1.AppError("Exchange rate must be greater than 0", 400);
    }
    let settings = await Setting_1.default.findOne();
    if (settings) {
        settings.usdToNgnRate = usdToNgnRate;
        settings.lastUpdated = new Date();
        settings.updatedBy = req.user?.id ? new mongoose_1.default.Types.ObjectId(req.user.id) : undefined;
        await settings.save();
    }
    else {
        settings = await Setting_1.default.create({
            usdToNgnRate,
            updatedBy: req.user?.id ? new mongoose_1.default.Types.ObjectId(req.user.id) : undefined,
        });
    }
    await settings.populate("updatedBy", "firstName lastName");
    (0, currencyHelper_1.clearExchangeRateCache)();
    index_1.io.emit("exchange-rate-updated", {
        usdToNgnRate: settings.usdToNgnRate,
        lastUpdated: settings.lastUpdated,
        updatedBy: settings.updatedBy && typeof settings.updatedBy === 'object' && 'firstName' in settings.updatedBy && 'lastName' in settings.updatedBy
            ? `${settings.updatedBy.firstName} ${settings.updatedBy.lastName}`
            : null,
    });
    const responseData = {
        usdToNgnRate: settings.usdToNgnRate,
        lastUpdated: settings.lastUpdated,
        updatedBy: settings.updatedBy && typeof settings.updatedBy === 'object' && 'firstName' in settings.updatedBy && 'lastName' in settings.updatedBy
            ? `${settings.updatedBy.firstName} ${settings.updatedBy.lastName}`
            : null,
    };
    res.status(200).json({
        success: true,
        message: "Exchange rate updated successfully",
        settings: responseData,
    });
});
//# sourceMappingURL=settingsController.js.map