"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.updateOrderStatus = exports.createOrder = exports.verifyPayment = exports.getOrder = exports.getMyOrders = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const index_1 = require("../index");
const crypto_1 = __importDefault(require("crypto"));
const PaystackVerification_1 = require("../utils/PaystackVerification");
exports.getOrders = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orders = await Order_1.default.find();
    res.status(200).json(orders);
});
exports.getMyOrders = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orders = await Order_1.default.find({ user: req.user?.id })
        .populate("items.product", "name images")
        .sort({ createdAt: -1 });
    res.status(200).json(orders);
});
exports.getOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const filter = { _id: req.params.id };
    if (req.user?.role === "customer") {
        filter.user = req.user.id;
    }
    const order = await Order_1.default.findOne(filter)
        .populate("user", "firstName lastName email")
        .populate("items.product", "name images");
    if (!order) {
        throw new AppError_1.AppError("Order not found", 404);
    }
    res.status(200).json(order);
});
exports.verifyPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { reference, expectedAmount } = req.body;
    if (!reference) {
        throw new AppError_1.AppError("Payment reference is required", 400);
    }
    try {
        const verification = await (0, PaystackVerification_1.verifyPaystackPayment)(reference);
        if (!verification.success) {
            throw new AppError_1.AppError("Payment verification failed", 400);
        }
        const paidAmount = verification.data.amount;
        if (expectedAmount && paidAmount !== expectedAmount) {
            throw new AppError_1.AppError("Payment amount mismatch", 400);
        }
        if (verification.data.status !== 'success') {
            throw new AppError_1.AppError("Payment was not successful", 400);
        }
        res.json({
            verified: true,
            data: verification.data,
            message: "Payment verified successfully"
        });
    }
    catch (error) {
        console.error('Payment verification error:', error);
        throw new AppError_1.AppError("Payment verification failed", 400);
    }
});
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId, items, shippingAddress, billingAddress, paymentMethod, paymentDetails } = req.body;
    if (!items || items.length === 0) {
        throw new AppError_1.AppError("No order items provided", 400);
    }
    if (paymentMethod === 'paystack' && paymentDetails?.reference) {
        try {
            const verification = await (0, PaystackVerification_1.verifyPaystackPayment)(paymentDetails.reference);
            if (!verification.success || verification.data.status !== 'success') {
                throw new AppError_1.AppError("Invalid payment reference", 400);
            }
        }
        catch (error) {
            throw new AppError_1.AppError("Payment verification failed", 400);
        }
    }
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
        const product = await Product_1.default.findById(item.productId);
        if (!product) {
            throw new AppError_1.AppError(`Product ${item.productId} not found`, 404);
        }
        if (!product.inStock || product.stockCount < item.quantity) {
            throw new AppError_1.AppError(`Insufficient stock for ${product.name}`, 400);
        }
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        orderItems.push({
            product: product._id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            image: product.images[0],
        });
        product.stockCount -= item.quantity;
        if (product.stockCount === 0) {
            product.inStock = false;
        }
        await product.save();
    }
    const shipping = subtotal > 50000 ? 0 : 2500;
    const tax = subtotal * 0.075;
    const total = subtotal + shipping + tax;
    const orderNumber = `ORD-${Date.now()}-${crypto_1.default.randomBytes(3).toString('hex').toUpperCase()}`;
    const order = await Order_1.default.create({
        orderNumber,
        user: userId || undefined,
        items: orderItems,
        subtotal,
        shipping,
        tax,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        paymentDetails,
        status: paymentMethod === 'paystack' ? 'confirmed' : 'pending',
        paymentStatus: paymentMethod === 'paystack' ? 'paid' : 'pending',
    });
    await order.populate('items.product');
    index_1.io.emit("order-created", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
    });
    res.status(201).json(order);
});
exports.updateOrderStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { status, trackingNumber } = req.body;
    const order = await Order_1.default.findByIdAndUpdate(req.params.id, {
        status,
        ...(trackingNumber && { trackingNumber }),
        ...(status === "delivered" && { deliveredAt: new Date() }),
    }, {
        new: true,
        runValidators: true,
    }).populate("user", "firstName lastName email");
    if (!order) {
        throw new AppError_1.AppError("Order not found", 404);
    }
    index_1.io.emit("order-updated", {
        orderId: order._id,
        status: order.status
    });
    res.status(200).json(order);
});
exports.cancelOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { reason } = req.body;
    const filter = { _id: req.params.id };
    if (req.user?.role === "customer") {
        filter.user = req.user.id;
    }
    const order = await Order_1.default.findOne(filter);
    if (!order) {
        throw new AppError_1.AppError("Order not found", 404);
    }
    if (!["pending", "confirmed"].includes(order.status)) {
        throw new AppError_1.AppError("Order cannot be cancelled at this stage", 400);
    }
    for (const item of order.items) {
        const product = await Product_1.default.findById(item.product);
        if (product) {
            product.stockCount += item.quantity;
            product.inStock = true;
            await product.save();
        }
    }
    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    await order.save();
    res.status(200).json(order);
});
//# sourceMappingURL=orderController.js.map