import Order from "../models/Order";
import { Request, Response } from "express";
import Product from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import crypto from "crypto";
import mongoose from "mongoose";
import { emitOrderEvent, emitProductEvent } from "../utils/realtime";
import { verifyPaystackPayment } from "../utils/PaystackVerification";
import {
	orderPlacedMail,
	paymentRejectedAlertMail,
	staffOrderNotificationMail,
	stockAlertMail,
} from "../services/emailService";
import { getStaffMails } from "../utils/GetStaffMails";
import { convertOrdersPrices, convertOrderPrices, getExchangeRate } from "../utils/currencyHelper";
import { buildQuote } from "../utils/pricing";
import { PUBLIC_PRODUCT_FILTER } from "../utils/productVisibility";
import PrivateLink, { hashLinkToken, itemColorOptions, itemSizeOptions, usableLinkFilter } from "../models/PrivateLink";
import { logLinkEvent } from "../models/PrivateLinkEvent";
import { getRealClientIp } from "../utils/GetIp";

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

interface CartLine {
	product: any;
	quantity: number;
	size?: string;
	color?: string;
}

// Resolve what is being bought into product documents without touching stock.
// With a private link token the link's preset cart is used and the body's items are ignored.
// Cart lines for a private collection: product must belong to the link, options must be the
// product's real sizes/colours, and the total quantity per product must fit current stock.
const resolveCollectionCart = async (link: any, items: any[]): Promise<CartLine[]> => {
	if (items.length > 50) {
		throw new AppError("Too many items in cart", 400);
	}
	const allowed = new Set(link.items.map((item: any) => String(item.product)));
	const lines: CartLine[] = [];
	const perProduct = new Map<string, number>();
	for (const item of items) {
		if (!item || !mongoose.isValidObjectId(item.productId) || !allowed.has(String(item.productId))) {
			throw new AppError("An item in your cart is not part of this collection", 400);
		}
		if (!Number.isInteger(item.quantity) || item.quantity < 1) {
			throw new AppError("Invalid item quantity", 400);
		}
		const product = await Product.findOne({ _id: item.productId, isActive: true });
		if (!product) {
			throw new AppError("An item in this collection is no longer available", 404);
		}
		const size = typeof item.size === "string" && item.size ? item.size : undefined;
		const color = typeof item.color === "string" && item.color ? item.color : undefined;
		if (product.sizes.length && (!size || !product.sizes.includes(size))) {
			throw new AppError(`Please choose a valid size for ${product.name}`, 400);
		}
		if (product.colors.length && (!color || !product.colors.includes(color))) {
			throw new AppError(`Please choose a valid colour for ${product.name}`, 400);
		}
		const total = (perProduct.get(String(product._id)) || 0) + item.quantity;
		if (total > product.stockCount) {
			throw new AppError(`Only ${product.stockCount} of ${product.name} left in stock`, 400);
		}
		perProduct.set(String(product._id), total);
		lines.push({ product, quantity: item.quantity, size: product.sizes.length ? size : undefined, color: product.colors.length ? color : undefined });
	}
	return lines;
};

const resolveCart = async (body: any): Promise<{ link: any; lines: CartLine[] }> => {
	const { items, privateLinkToken } = body;
	let link: any = null;
	let requested: {
		productId: any;
		quantity: number;
		size?: string;
		color?: string;
		linkItem?: any;
		selection?: { size?: string; color?: string };
	}[];

	if (privateLinkToken !== undefined && privateLinkToken !== null && privateLinkToken !== "") {
		if (typeof privateLinkToken !== "string") {
			throw new AppError("Private link not found", 404);
		}
		link = await PrivateLink.findOne({ tokenHash: hashLinkToken(privateLinkToken) });
		if (!link) {
			throw new AppError("Private link not found", 404);
		}
		if (Array.isArray(items) && items.length > 0) {
			// Shoppable collection: the buyer's own cart lines, limited to the link's products
			return { link, lines: await resolveCollectionCart(link, items) };
		}
		// Legacy preset cart (older clients): buyer choices apply only to "choosable" items
		const selections = Array.isArray(body.selections) ? body.selections : [];
		requested = link.items.map((item: any, index: number) => ({
			productId: item.product,
			quantity: item.quantity,
			size: item.size,
			color: item.color,
			linkItem: item,
			selection: item.specMode === "choosable" ? selections[index] : undefined,
		}));
	} else {
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
		requested = items;
	}

	const lines: CartLine[] = [];
	for (const item of requested) {
		// Private-sale products are only reachable through a link
		const filter = link ? { _id: item.productId, isActive: true } : { _id: item.productId, ...PUBLIC_PRODUCT_FILTER };
		const product = await Product.findOne(filter);
		if (!product) {
			throw new AppError(link ? "An item on this private link is no longer available" : `Product ${item.productId} not found`, 404);
		}
		let { size, color } = item;
		if (item.linkItem?.specMode === "choosable") {
			const sizeOptions = itemSizeOptions(item.linkItem, product);
			const colorOptions = itemColorOptions(item.linkItem, product);
			size = typeof item.selection?.size === "string" && item.selection.size ? item.selection.size : size;
			color = typeof item.selection?.color === "string" && item.selection.color ? item.selection.color : color;
			if (sizeOptions.length && (!size || !sizeOptions.includes(size))) {
				throw new AppError(`Please choose a valid size for ${product.name}`, 400);
			}
			if (colorOptions.length && (!color || !colorOptions.includes(color))) {
				throw new AppError(`Please choose a valid colour for ${product.name}`, 400);
			}
		}
		lines.push({ product, quantity: item.quantity, size, color });
	}

	return { link, lines };
};

// @desc    Quote an order (items or private link): exact amount the client must charge
// @route   POST /api/orders/quote
// @access  Public
export const quoteOrder = asyncHandler(async (req: Request, res: Response) => {
	const { link, lines } = await resolveCart(req.body);
	if (link && link.status !== "active") {
		throw new AppError("Private link not found", 404);
	}

	const quote = await buildQuote(lines.map((line) => ({ price: line.product.price, quantity: line.quantity })));

	res.status(200).json({
		currency: "NGN",
		items: lines.map((line) => ({
			productId: line.product.id,
			name: line.product.name,
			image: line.product.images[0],
			size: line.size,
			color: line.color,
			quantity: line.quantity,
			unitPriceNGN: Math.round(line.product.price * quote.rate),
			available: line.product.stockCount >= line.quantity,
		})),
		subtotal: quote.subtotalNGN,
		shipping: quote.shippingNGN,
		total: quote.totalNGN,
		amountKobo: quote.amountKobo,
		shippingRule: quote.shippingRule,
		...(link && { privateLink: { title: link.title, expiresAt: link.expiresAt } }),
	});
});

// Recipients for operational alerts: ALERT_EMAIL (comma-separated) or every admin user
const getAlertRecipients = async (): Promise<string[]> => {
	const configured = (process.env.ALERT_EMAIL || "")
		.split(",")
		.map((email) => email.trim())
		.filter(Boolean);
	return configured.length ? configured : getStaffMails(["admin"]);
};

// If an order fails after the customer was actually charged, tell staff so they can refund or complete it.
// Never throws: alerting must not change the response the customer gets.
const alertIfPaymentCaptured = async (req: Request, error: any) => {
	try {
		const { paymentMethod, paymentDetails, shippingAddress, billingAddress, privateLinkToken } = req.body || {};
		const reference = paymentDetails?.reference;
		if (paymentMethod !== "paystack" || !reference || typeof reference !== "string") return;
		// 409: the reference already backs an existing order, so no money is unaccounted for
		if (error?.statusCode === 409) return;

		let verification = (req as any).paystackVerification;
		if (!verification) {
			verification = await verifyPaystackPayment(reference);
		}
		if (!verification?.success || verification.data?.status !== "success") return;
		if (await Order.exists({ "paymentDetails.reference": reference })) return;

		const recipients = await getAlertRecipients();
		if (!recipients.length) return;

		await paymentRejectedAlertMail(recipients, {
			reference,
			amountNGN: typeof verification.data.amount === "number" ? verification.data.amount / 100 : undefined,
			customerEmail: billingAddress?.email || shippingAddress?.email || verification.data.customer?.email,
			reason: error?.message || "Unknown error",
			privateLink: !!privateLinkToken,
		});
	} catch (alertError) {
		console.error("Failed to send payment-rejected alert:", alertError);
	}
};

// @desc    Create order
// @route   POST /api/orders
// @access  Public (guest) / optional auth
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
	try {
		await placeOrder(req, res);
	} catch (error) {
		await alertIfPaymentCaptured(req, error);
		throw error;
	}
});

const placeOrder = async (req: Request, res: Response) => {
	const { shippingAddress, billingAddress, paymentMethod, paymentDetails } = req.body;
	// Never trust a userId from the body: use the authenticated user (optionalAuth) or guest
	const userId = req.user?.id;
	const lowStocks = [];
	const outOfStocks = [];

	const { link, lines } = await resolveCart(req.body);

	if (link && paymentMethod !== "paystack") {
		throw new AppError("Private link orders must be paid with Paystack", 400);
	}

	const quote = await buildQuote(lines.map((line) => ({ price: line.product.price, quantity: line.quantity })));

	// Paystack: the reference must be present, unused, verified, and for exactly the quoted amount.
	// Any mismatch is rejected outright: no order, no stock change.
	let paymentVerified = false;
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
		(req as any).paystackVerification = verification; // reused by the failure alert

		const paidKobo = Number(verification.data.amount);
		const currency = verification.data.currency;
		if (paidKobo !== quote.amountKobo || (currency && currency !== "NGN")) {
			console.error(
				`Payment amount mismatch for ${reference}: charged ${paidKobo} ${currency || ""}, expected ${quote.amountKobo} NGN`,
			);
			throw new AppError(
				`Payment amount mismatch: charged ${paidKobo / 100} NGN but the order total is ${quote.totalNGN} NGN. No order was created.`,
				400,
			);
		}
		paymentVerified = true;
	}

	// Atomically reserve stock
	const orderItems = [];
	const reserved: { id: any; quantity: number }[] = [];
	let linkUseConsumed = false;

	const rollback = async () => {
		for (const r of reserved) {
			await Product.updateOne({ _id: r.id }, { $inc: { stockCount: r.quantity }, $set: { inStock: true } });
		}
		if (linkUseConsumed) {
			await PrivateLink.updateOne({ _id: link._id }, { $inc: { uses: -1 } });
		}
	};

	try {
		for (const line of lines) {
			// Conditional decrement: only succeeds if still orderable with enough stock,
			// so concurrent checkouts can't oversell.
			const baseFilter = link ? { isActive: true } : PUBLIC_PRODUCT_FILTER;
			const product = await Product.findOneAndUpdate(
				{ _id: line.product._id, ...baseFilter, stockCount: { $gte: line.quantity } },
				{ $inc: { stockCount: -line.quantity } },
				{ new: true },
			);

			if (!product) {
				throw new AppError(`Insufficient stock for ${line.product.name}`, 400);
			}
			reserved.push({ id: product._id, quantity: line.quantity });

			orderItems.push({
				product: product._id,
				name: product.name,
				price: line.product.price, // the quoted price that was charged
				quantity: line.quantity,
				size: line.size,
				color: line.color,
				image: product.images[0],
			});

			if (product.stockCount === 0) {
				await Product.updateOne({ _id: product._id }, { $set: { inStock: false } });
				product.inStock = false;
				outOfStocks.push(product);
			} else if (product.stockCount < 10) {
				lowStocks.push(product);
			}

			emitProductEvent("inventory-updated", product);
		}
	} catch (error) {
		await rollback();
		throw error;
	}

	// Private link: consume one use atomically. If the link expired, was revoked or ran out of
	// uses between quote and payment, the customer has already paid the exact amount, so keep
	// the order in a pending state for staff/salesrep to resolve manually.
	let reviewNote: string | undefined;
	if (link) {
		const consumed = await PrivateLink.findOneAndUpdate(
			{ _id: link._id, ...usableLinkFilter() },
			{ $inc: { uses: 1 } },
			{ new: true },
		);
		if (consumed) {
			linkUseConsumed = true;
		} else {
			const current = await PrivateLink.findById(link._id);
			reviewNote = `NEEDS REVIEW: private link "${link.title}" was ${current?.status || "unavailable"} when the order was placed`;
		}
	}

	// Generate order number
	const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

	const order = await Order.create({
		orderNumber,
		user: userId || undefined,
		items: orderItems,
		subtotal: quote.subtotalUSD,
		shipping: quote.shippingUSD,
		tax: 0, // Assuming no tax for simplicity, can be added later
		total: quote.totalUSD,
		shippingAddress,
		billingAddress: billingAddress || shippingAddress,
		paymentMethod,
		paymentDetails,
		status: paymentVerified && !reviewNote ? "confirmed" : "pending",
		paymentStatus: paymentVerified ? "paid" : "pending",
		notes: reviewNote,
		source: link ? "private_link" : "public",
		privateLink: link?._id,
	}).catch(async (error: any) => {
		await rollback();
		if (error?.code === 11000) {
			throw new AppError("This payment reference has already been used", 409);
		}
		throw error;
	});

	if (link) {
		await logLinkEvent({
			link: link._id,
			action: reviewNote ? "order_needs_review" : "ordered",
			order: order._id as any,
			ip: getRealClientIp(req),
			details: reviewNote ? { note: reviewNote } : undefined,
		});
	}

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
};

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
