"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductCategories = exports.updateProductStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getAdminProducts = exports.getProduct = exports.getProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const index_1 = require("../index");
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const products = await Product_1.default.find({ isActive: true });
    res.status(200).json(products);
});
exports.getProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.default.findOne({
        _id: req.params.id,
        isActive: true,
    });
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    res.status(200).json(product);
});
exports.getAdminProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const products = await Product_1.default.find();
    res.status(200).json(products);
});
exports.createProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.default.create(req.body);
    index_1.io.emit("product-created", product);
    res.status(201).json(product);
});
exports.updateProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.default.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    index_1.io.emit("inventory-updated", product);
    res.status(200).json(product);
});
exports.deleteProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.default.findById(req.params.id);
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    await product.deleteOne();
    index_1.io.emit("product-deleted", product.id);
    res.status(200).json({
        success: true,
        message: "Product deleted permanently",
    });
});
exports.updateProductStock = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { stockCount } = req.body;
    const product = await Product_1.default.findByIdAndUpdate(req.params.id, {
        stockCount,
        inStock: stockCount > 0,
    }, {
        new: true,
        runValidators: true,
    });
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    index_1.io.emit("inventory-updated", product);
    res.status(200).json(product);
});
exports.getProductCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const categories = await Product_1.default.distinct("category", { isActive: true });
    res.status(200).json(categories);
});
//# sourceMappingURL=productController.js.map