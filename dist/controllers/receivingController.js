"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentReceiving = exports.recordReceiving = void 0;
const Receiving_1 = require("../models/Receiving");
const asyncHandler_1 = require("../utils/asyncHandler");
const Product_1 = __importDefault(require("../models/Product"));
const index_1 = require("../index");
exports.recordReceiving = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId, quantity, note } = req.body;
    if (!productId || !quantity || quantity <= 0) {
        res.status(400);
        throw new Error("Product ID and positive quantity are required.");
    }
    const product = await Product_1.default.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error("Product not found.");
    }
    const receiving = await Receiving_1.Receiving.create({
        product: product._id,
        quantity,
        note,
        receivedBy: req.user ? req.user.id : null,
    });
    product.stockCount += quantity;
    await product.save();
    index_1.io.emit("inventory-updated", product);
    res.status(201).json({
        success: true,
        message: "Stock received and updated successfully.",
        receiving,
    });
});
exports.getRecentReceiving = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20 } = req.query;
    const receiving = await Receiving_1.Receiving.find()
        .populate({
        path: "product",
        select: "name category",
    })
        .populate({
        path: "receivedBy",
        select: "firstName lastName",
    })
        .sort({ receivedAt: -1 })
        .limit(parseInt(limit, 10));
    res.status(200).json({
        success: true,
        count: receiving.length,
        receiving,
    });
});
//# sourceMappingURL=receivingController.js.map