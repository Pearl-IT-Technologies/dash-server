import Order from "../models/Order";
import { Request, Response } from "express";
import Product from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import crypto from "crypto";
import mongoose from "mongoose";
import { emitOrderEvent, emitProductEvent } from "../utils/realtime";
import { verifyPaystackPayment } from "../utils/PaystackVerification";
import { orderPlacedMail, staffOrderNotificationMail, stockAlertMail } from "../services/emailService";
import { getStaffMails } from "../utils/GetStaffMails";
import { convertOrdersPrices, convertOrderPrices, getExchangeRate } from "../utils/currencyHelper";

// Amount (kobo) the customer should have been charged: per-item NGN prices are rounded
// the same way the storefront displays them (see convertProductPrices).
export const expectedChargeKobo = (items: { price: number; quantity: number }[], shippingUsd: number, rate: number) => {
	const itemsNgn = items.reduce((sum, item) => sum + Math.round(item.price * rate) * item.quantity, 0);
	return (itemsNgn + Math.round(shippingUsd * rate)) * 100;
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin/Staff)
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
	const orders = await Order.find();
	const convertedOrders = await convertOrdersPrices(orders);
	
	res.status(200).json(convertedOrders);
});

// @desc    Get user orders
// @route   GET /api/orders/my
// @access  Private
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
	const orders = await Order.find({ user: req.user?.id })
		.populate("items.product", "name images")
		.sort({ createdAt: -1 });

	const convertedOrders = await convertOrdersPrices(orders);
	res.status(200).json(convertedOrders);
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
	const filter: any = { _id: req.params.id };

	// Non-admin users can only see their own orders
	if (req.user?.role === "customer") {
		filter.user = req.user.id;
	}

	const order = await Order.findOne(filter)
		.populate("user", "firstName lastName email")
		.populate("items.product", "name images");

	if (!order) {
		throw new AppError("Order not found", 404);
	}

	const convertedOrder = await convertOrderPrices(order);
	res.status(200).json(convertedOrder);
});

// @desc    Verify Paystack payment
// @route   POST /api/orders/verify-payment
// @access  Private
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
	const { reference, expectedAmount } = req.body;

	if (!reference) {
		throw new AppError("Payment reference is required", 400);
	}

	try {
		const verification = await verifyPaystackPayment(reference);

		if (!verification.success) {
			throw new AppError("Payment verification failed", 400);
		}

		// Check if payment amount matches expected amount
		const paidAmount = verification.data.amount;
		if (expectedAmount && paidAmount !== expectedAmount) {
			throw new AppError("Payment amount mismatch", 400);
		}

		// Check if payment status is successful
		if (verification.data.status !== "success") {
			throw new AppError("Payment was not successful", 400);
		}

		res.json({
			verified: true,
			data: verification.data,
			message: "Payment verified successfully",
		});
	} catch (error) {
		console.error("Payment verification error:", error);
		throw new AppError("Payment verification failed", 400);
	}
});

// @desc    Create order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
	const { items, shippingAddress, billingAddress, paymentMethod, paymentDetails } = req.body;
	// Never trust a userId from the body: use the authenticated user (optionalAuth) or guest
	const userId = req.user?.id;
	const lowStocks = [];
	const outOfStocks = [];

	if (!Array.isArray(items) || items.length === 0) {
		throw new AppError("No order items provided", 400);
	}

	for (const item of items) {
		if (!item || !mongoose.isValidObjectId(item.productId)) {
			throw new AppError("Invalid product in order", 400);
		}
		if (!Number.isInteger(item.quantity) || item.quantity < 1) {
			throw new AppError("Invalid item quantity", 400);
		}
	}

	// Paystack: the reference must be present, unused, and verified with Paystack
	let paidAmountKobo: number | null = null;
	const reference: string | undefined = paymentDetails?.reference;
	if (paymentMethod === "paystack") {
		if (!reference || typeof reference !== "string") {
			throw new AppError("Payment reference is required", 400);
		}

		const existing = await Order.findOne({ "paymentDetails.reference": reference }).select("_id");
		if (existing) {
			throw new AppError("This payment reference has already been used", 409);
		}

		let verification;
		try {
			verification = await verifyPaystackPayment(reference);
		} catch (error) {
			throw new AppError("Payment verification failed", 400);
		}
		if (!verification.success || verification.data?.status !== "success") {
			throw new AppError("Invalid payment reference", 400);
		}
		paidAmountKobo = Number(verification.data.amount);
	}

	// Calculate totals and atomically reserve stock
	let subtotal = 0;
	const orderItems = [];
	const reserved: { id: any; quantity: number }[] = [];

	const releaseStock = async () => {
		for (const r of reserved) {
			await Product.updateOne({ _id: r.id }, { $inc: { stockCount: r.quantity }, $set: { inStock: true } });
		}
	};

	try {
		for (const item of items) {
			// Conditional decrement: only succeeds if the product is orderable and has enough stock,
			// so concurrent checkouts can't oversell.
			const product = await Product.findOneAndUpdate(
				{
					_id: item.productId,
					isActive: true,
					visibility: { $ne: "private" }, // private-sale items will only be orderable via a valid link
					stockCount: { $gte: item.quantity },
				},
				{ $inc: { stockCount: -item.quantity } },
				{ new: true },
			);

			if (!product) {
				const exists = await Product.findOne({ _id: item.productId, isActive: true, visibility: { $ne: "private" } });
				if (!exists) {
					throw new AppError(`Product ${item.productId} not found`, 404);
				}
				throw new AppError(`Insufficient stock for ${exists.name}`, 400);
			}
			reserved.push({ id: product._id, quantity: item.quantity });

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

			if (product.stockCount === 0) {
				await Product.updateOne({ _id: product._id }, { $set: { inStock: false } });
				product.inStock = false;
				outOfStocks.push(product);
			} else if (product.stockCount < 10) {
				lowStocks.push(product);
			}

			// Emit real-time product update
			emitProductEvent("inventory-updated", product);
		}
	} catch (error) {
		await releaseStock();
		throw error;
	}

	// Calculate shipping (free shipping for orders over $30 USD)
	const shipping = subtotal > 30 ? 0 : 5; // $5 shipping fee
	const total = subtotal + shipping;

	// Verify the amount actually charged by Paystack covers the server-computed total.
	// The payment is already captured at this point, so on a shortfall we still record the
	// order but leave it unpaid/pending for staff review instead of losing it.
	let paymentOk = false;
	let reviewNote: string | undefined;
	if (paymentMethod === "paystack" && paidAmountKobo !== null) {
		const rate = await getExchangeRate();
		const expectedKobo = expectedChargeKobo(orderItems, shipping, rate);
		if (paidAmountKobo >= expectedKobo) {
			paymentOk = true;
		} else {
			reviewNote = `NEEDS REVIEW: Paystack charged ${paidAmountKobo / 100} NGN, expected ${expectedKobo / 100} NGN`;
		}
	}

	// Generate order number
	const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

	const order = await Order.create({
		orderNumber,
		user: userId || undefined,
		items: orderItems,
		subtotal,
		shipping,
		tax: 0, // Assuming no tax for simplicity, can be added later
		total,
		shippingAddress,
		billingAddress: billingAddress || shippingAddress,
		paymentMethod,
		paymentDetails,
		status: paymentOk ? "confirmed" : "pending",
		paymentStatus: paymentOk ? "paid" : "pending",
		notes: reviewNote,
	}).catch(async (error: any) => {
		await releaseStock();
		if (error?.code === 11000) {
			throw new AppError("This payment reference has already been used", 409);
		}
		throw error;
	});

	// Populate the order with product details
	await order.populate("items.product");

	// Emit real-time update (staff + owning user only)
	emitOrderEvent("order-created", order, order.user);

	// Notify user about new order
	if (order.billingAddress?.email) {
		const rate = await getExchangeRate();
		const itemsWithNgn = order.items.map((item: any) => ({
			...(item.toJSON ? item.toJSON() : item),
			price: Math.round(item.price * rate),
		}));

		await orderPlacedMail(order.billingAddress.email, {
			orderNumber: order.orderNumber,
			items: itemsWithNgn,
			total: Math.round(order.total * rate),
			shippingAddress: order.shippingAddress,
			paymentMethod: order.paymentMethod,
		});
	}

	{
		const rate = await getExchangeRate();
		const itemsWithNgn = order.items.map((item: any) => ({
			...(item.toJSON ? item.toJSON() : item),
			price: Math.round(item.price * rate),
		}));

		await staffOrderNotificationMail(await getStaffMails(["admin", "storekeeper"]), {
			orderNumber: order.orderNumber,
			items: itemsWithNgn,
			total: Math.round(order.total * rate),
			shippingAddress: order.shippingAddress,
			paymentMethod: order.paymentMethod,
			customerEmail: order.billingAddress?.email,
		});
	}

	// Send stock alert emails if any products are low on stock
	if (lowStocks.length > 0) {
		//Alert Staffs for out of stock
		await stockAlertMail(await getStaffMails(["admin", "storekeeper", "salesrep"]), {
			products: lowStocks,
			alertType: "low_stock",
		});
	}

	// Send stock alert emails if any products are out of stock
	if (outOfStocks.length > 0) {
		await stockAlertMail(await getStaffMails(["admin", "storekeeper", "salesrep"]), {
			products: outOfStocks,
			alertType: "out_of_stock",
		});
	}

	const convertedOrder = await convertOrderPrices(order);
	res.status(201).json(convertedOrder);
});

// @desc    Track order publicly (no auth required)
// @route   GET /api/orders/track/:orderNumber
// @access  Public
export const trackOrderPublic = asyncHandler(async (req: Request, res: Response) => {
	const { orderNumber } = req.params;
	
	if (!orderNumber || orderNumber.trim() === '') {
		throw new AppError("Order number is required", 400);
	}

	// Find order by order number (case-insensitive)
	const order = await Order.findOne({ 
		orderNumber: { $regex: new RegExp(`^${orderNumber.trim()}$`, 'i') }
	}).populate("items.product", "name images");

	if (!order) {
		throw new AppError("Order not found", 404);
	}

	// Get exchange rate for currency conversion
	const rate = await getExchangeRate();

	// Return limited public information with currency conversion
	const publicOrderInfo = {
		orderNumber: order.orderNumber,
		status: order.status,
		paymentStatus: order.paymentStatus,
		trackingNumber: order.trackingNumber,
		estimatedDelivery: order.estimatedDelivery,
		deliveredAt: order.deliveredAt,
		createdAt: order.createdAt,
		totalUSD: order.total,
		totalNGN: Math.round(order.total * rate),
		total: Math.round(order.total * rate), // For compatibility
		itemCount: order.items.length,
		currency: {
			usdToNgnRate: rate,
			lastUpdated: new Date()
		},
		// Shipping address (city and state only for privacy)
		shippingLocation: {
			city: order.shippingAddress.city,
			state: order.shippingAddress.state,
			country: order.shippingAddress.country
		},
		// Basic item info (no personal details)
		items: order.items.map((item: any) => ({
			name: item.name,
			quantity: item.quantity,
			priceUSD: item.price,
			priceNGN: Math.round(item.price * rate),
			price: Math.round(item.price * rate), // For compatibility
			image: item.image
		}))
	};

	res.status(200).json({
		success: true,
		data: publicOrderInfo
	});
});

// @desc    Update order
// @route   PATCH /api/orders/:id
// @access  Private (Admin/Staff)
export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
	const { status, paymentStatus, trackingNumber, estimatedDelivery, notes } = req.body;

	// Check if order exists
	const existingOrder = await Order.findById(req.params.id);
	if (!existingOrder) {
		throw new AppError("Order not found", 404);
	}

	// Build update object
	const updateData: any = {};

	if (status !== undefined) updateData.status = status;
	if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
	if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber?.trim() || null;
	if (estimatedDelivery !== undefined)
		updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
	if (notes !== undefined) updateData.notes = notes?.trim() || null;

	// Auto-set deliveredAt when status becomes delivered
	if (status === "delivered") {
		updateData.deliveredAt = new Date();
	}

	// Require tracking number for shipped orders
	if (status === "shipped") {
		const finalTrackingNumber = trackingNumber || existingOrder.trackingNumber;
		if (!finalTrackingNumber?.trim()) {
			throw new AppError("Tracking number is required when status is set to shipped", 400);
		}
	}

	const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
		.populate("user", "firstName lastName email")
		.populate("items.product", "name images");

	// Emit real-time update
	emitOrderEvent("order-updated", order, order?.user);

	const convertedOrder = await convertOrderPrices(order);
	res.status(200).json(convertedOrder);
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Admin/Staff)
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
	const { status, trackingNumber } = req.body;

	const order = await Order.findByIdAndUpdate(
		req.params.id,
		{
			status,
			...(trackingNumber && { trackingNumber }),
			...(status === "delivered" && { deliveredAt: new Date() }),
		},
		{
			new: true,
			runValidators: true,
		},
	).populate("user", "firstName lastName email");

	if (!order) {
		throw new AppError("Order not found", 404);
	}

	// Emit real-time update
	emitOrderEvent(
		"order-updated",
		{
			orderId: order._id,
			status: order.status,
		},
		order.user,
	);

	const convertedOrder = await convertOrderPrices(order);
	res.status(200).json(convertedOrder);
});

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
	const { reason } = req.body;

	const filter: any = { _id: req.params.id };

	// Non-admin users can only cancel their own orders
	if (req.user?.role === "customer") {
		filter.user = req.user.id;
	}

	const order = await Order.findOne(filter);

	if (!order) {
		throw new AppError("Order not found", 404);
	}

	if (!["pending", "confirmed"].includes(order.status)) {
		throw new AppError("Order cannot be cancelled at this stage", 400);
	}

	// Restore product stock
	for (const item of order.items) {
		await Product.updateOne({ _id: item.product }, { $inc: { stockCount: item.quantity }, $set: { inStock: true } });
	}

	order.status = "cancelled";
	order.cancelledAt = new Date();
	order.cancelReason = reason;
	await order.save();

	// Emit real-time update
	emitOrderEvent(
		"order-updated",
		{
			orderId: order._id,
			status: order.status,
		},
		order.user,
	);

	const convertedOrder = await convertOrderPrices(order);
	res.status(200).json(convertedOrder);
});
