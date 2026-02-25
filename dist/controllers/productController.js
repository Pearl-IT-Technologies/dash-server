"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductCategories = exports.updateProductStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const index_1 = require("../index");
const currencyHelper_1 = require("../utils/currencyHelper");
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const products = await Product_1.default.find({ isActive: true });
    const convertedProducts = await (0, currencyHelper_1.convertProductsPrices)(products);
    res.status(200).json(convertedProducts);
});
exports.getProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new AppError_1.AppError("Invalid product ID", 400);
    }
    const product = await Product_1.default.findOne({
        _id: id,
        isActive: true,
    });
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    const convertedProduct = await (0, currencyHelper_1.convertProductPrices)(product);
    res.status(200).json(convertedProduct);
});
exports.createProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.default.create(req.body);
    const convertedProduct = await (0, currencyHelper_1.convertProductPrices)(product);
    index_1.io.emit("product-created", convertedProduct);
    res.status(201).json(convertedProduct);
});
exports.updateProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new AppError_1.AppError("Invalid product ID", 400);
    }
    const product = await Product_1.default.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    const convertedProduct = await (0, currencyHelper_1.convertProductPrices)(product);
    index_1.io.emit("inventory-updated", convertedProduct);
    res.status(200).json(convertedProduct);
});
exports.deleteProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new AppError_1.AppError("Invalid product ID", 400);
    }
    const product = await Product_1.default.findById(id);
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
    const { id } = req.params;
    if (!id) {
        throw new AppError_1.AppError("Invalid product ID", 400);
    }
    const { stockCount } = req.body;
    const product = await Product_1.default.findByIdAndUpdate(id, {
        stockCount,
        inStock: stockCount > 0,
    }, {
        new: true,
        runValidators: true,
    });
    if (!product) {
        throw new AppError_1.AppError("Product not found", 404);
    }
    const convertedProduct = await (0, currencyHelper_1.convertProductPrices)(product);
    index_1.io.emit("inventory-updated", convertedProduct);
    res.status(200).json(convertedProduct);
});
exports.getProductCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const categories = await Product_1.default.distinct("category", { isActive: true });
    res.status(200).json(categories);
});
//# sourceMappingURL=productController.js.map