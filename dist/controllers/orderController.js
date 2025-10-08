"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.updateOrderStatus = exports.updateOrder = exports.trackOrderPublic = exports.createOrder = exports.verifyPayment = exports.getOrder = exports.getMyOrders = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const index_1 = require("../index");
const crypto_1 = __importDefault(require("crypto"));
const PaystackVerification_1 = require("../utils/PaystackVerification");
const emailService_1 = require("../services/emailService");
const GetStaffMails_1 = require("../utils/GetStaffMails");
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
        if (verification.data.status !== "success") {
            throw new AppError_1.AppError("Payment was not successful", 400);
        }
        res.json({
            verified: true,
            data: verification.data,
            message: "Payment verified successfully",
        });
    }
    catch (error) {
        console.error("Payment verification error:", error);
        throw new AppError_1.AppError("Payment verification failed", 400);
    }
});
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId, items, shippingAddress, billingAddress, paymentMethod, paymentDetails } = req.body;
    const lowStocks = [];
    const outOfStocks = [];
    if (!items || items.length === 0) {
        throw new AppError_1.AppError("No order items provided", 400);
    }
    if (paymentMethod === "paystack" && paymentDetails?.reference) {
        try {
            const verification = await (0, PaystackVerification_1.verifyPaystackPayment)(paymentDetails.reference);
            if (!verification.success || verification.data.status !== "success") {
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
            outOfStocks.push(product);
        }
        else if (product.stockCount < 10) {
            lowStocks.push(product);
        }
        await product.save();
        index_1.io.emit("inventory-updated", product);
    }
    const shipping = subtotal > 30 ? 0 : 5;
    const total = subtotal + shipping;
    const orderNumber = `ORD-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex").toUpperCase()}`;
    const order = await Order_1.default.create({
        orderNumber,
        user: userId || undefined,
        items: orderItems,
        subtotal,
        shipping,
        tax: 0,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        paymentDetails,
        status: paymentMethod === "paystack" ? "confirmed" : "pending",
        paymentStatus: paymentMethod === "paystack" ? "paid" : "pending",
    });
    await order.populate("items.product");
    index_1.io.emit("order-created", order);
    if (order.billingAddress?.email) {
        await (0, emailService_1.orderPlacedMail)(order.billingAddress.email, {
            orderNumber: order.orderNumber,
            items: order.items,
            total: order.total,
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod,
        });
    }
    await (0, emailService_1.staffOrderNotificationMail)(await (0, GetStaffMails_1.getStaffMails)(["admin", "storekeeper"]), {
        orderNumber: order.orderNumber,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        customerEmail: order.billingAddress?.email,
    });
    if (lowStocks.length > 0) {
        await (0, emailService_1.stockAlertMail)(await (0, GetStaffMails_1.getStaffMails)(["admin", "storekeeper", "salesrep"]), {
            products: lowStocks,
            alertType: "low_stock",
        });
    }
    if (outOfStocks.length > 0) {
        await (0, emailService_1.stockAlertMail)(await (0, GetStaffMails_1.getStaffMails)(["admin", "storekeeper", "salesrep"]), {
            products: outOfStocks,
            alertType: "out_of_stock",
        });
    }
    res.status(201).json(order);
});
exports.trackOrderPublic = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { orderNumber } = req.params;
    if (!orderNumber || orderNumber.trim() === '') {
        throw new AppError_1.AppError("Order number is required", 400);
    }
    const order = await Order_1.default.findOne({
        orderNumber: { $regex: new RegExp(`^${orderNumber.trim()}$`, 'i') }
    }).populate("items.product", "name images");
    if (!order) {
        throw new AppError_1.AppError("Order not found", 404);
    }
    const publicOrderInfo = {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
        total: order.total,
        itemCount: order.items.length,
        shippingLocation: {
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            country: order.shippingAddress.country
        },
        items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image
        }))
    };
    res.status(200).json({
        success: true,
        data: publicOrderInfo
    });
});
exports.updateOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { status, paymentStatus, trackingNumber, estimatedDelivery, notes } = req.body;
    const existingOrder = await Order_1.default.findById(req.params.id);
    if (!existingOrder) {
        throw new AppError_1.AppError("Order not found", 404);
    }
    const updateData = {};
    if (status !== undefined)
        updateData.status = status;
    if (paymentStatus !== undefined)
        updateData.paymentStatus = paymentStatus;
    if (trackingNumber !== undefined)
        updateData.trackingNumber = trackingNumber?.trim() || null;
    if (estimatedDelivery !== undefined)
        updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    if (notes !== undefined)
        updateData.notes = notes?.trim() || null;
    if (status === "delivered") {
        updateData.deliveredAt = new Date();
    }
    if (status === "shipped") {
        const finalTrackingNumber = trackingNumber || existingOrder.trackingNumber;
        if (!finalTrackingNumber?.trim()) {
            throw new AppError_1.AppError("Tracking number is required when status is set to shipped", 400);
        }
    }
    const order = await Order_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
        .populate("user", "firstName lastName email")
        .populate("items.product", "name images");
    index_1.io.emit("order-updated", order);
    res.status(200).json(order);
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
        status: order.status,
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
    index_1.io.emit("order-updated", {
        orderId: order._id,
        status: order.status,
    });
    res.status(200).json(order);
});
//# sourceMappingURL=orderController.js.map