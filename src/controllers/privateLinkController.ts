// controllers/privateLinkController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import PrivateLink, { DEFAULT_LINK_TTL_HOURS, generateLinkToken, hashLinkToken } from "../models/PrivateLink";
import PrivateLinkEvent, { logLinkEvent } from "../models/PrivateLinkEvent";
import Product from "../models/Product";
import Order from "../models/Order";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { convertProductPrices, getExchangeRate } from "../utils/currencyHelper";
import { getRealClientIp } from "../utils/GetIp";

const MAX_TTL_HOURS = 24 * 90;

const linkUrl = (token: string) => `${(process.env.CLIENT_URL || "http://www.dashshops.com").replace(/\/$/, "")}/p/${token}`;

// Validate and normalise preset cart items: product + optional size/color + quantity
const parseItems = async (items: any) => {
	if (!Array.isArray(items) || items.length === 0) {
		throw new AppError("At least one item is required", 400);
	}
	const parsed = [];
	for (const item of items) {
		if (!item || !mongoose.isValidObjectId(item.product)) {
			throw new AppError("Invalid product in link items", 400);
		}
		if (!Number.isInteger(item.quantity) || item.quantity < 1) {
			throw new AppError("Invalid item quantity", 400);
		}
		const product = await Product.findOne({ _id: item.product, isActive: true });
		if (!product) {
			throw new AppError(`Product ${item.product} not found or inactive`, 404);
		}
		if (item.size && !product.sizes.includes(item.size)) {
			throw new AppError(`Size ${item.size} is not available for ${product.name}`, 400);
		}
		if (item.color && !product.colors.includes(item.color)) {
			throw new AppError(`Color ${item.color} is not available for ${product.name}`, 400);
		}
		parsed.push({ product: product._id, size: item.size, color: item.color, quantity: item.quantity });
	}
	return parsed;
};

const parseExpiry = (body: any, required: boolean) => {
	if (body.expiresAt !== undefined) {
		const date = new Date(body.expiresAt);
		if (isNaN(date.getTime()) || date.getTime() <= Date.now()) {
			throw new AppError("expiresAt must be a future date", 400);
		}
		if (date.getTime() > Date.now() + MAX_TTL_HOURS * 3600 * 1000) {
			throw new AppError(`Links cannot last longer than ${MAX_TTL_HOURS / 24} days`, 400);
		}
		return date;
	}
	if (body.expiresInHours !== undefined) {
		const hours = Number(body.expiresInHours);
		if (!(hours > 0) || hours > MAX_TTL_HOURS) {
			throw new AppError(`expiresInHours must be between 0 and ${MAX_TTL_HOURS}`, 400);
		}
		return new Date(Date.now() + hours * 3600 * 1000);
	}
	return required ? new Date(Date.now() + DEFAULT_LINK_TTL_HOURS * 3600 * 1000) : undefined;
};

const parseMaxUses = (value: any) => {
	if (value === undefined) return undefined;
	if (value === null) return null;
	if (!Number.isInteger(value) || value < 1) {
		throw new AppError("maxUses must be a positive integer or null", 400);
	}
	return value;
};

// @desc    Create a private sale link
// @route   POST /api/private-links
// @access  Private (Admin/Staff)
export const createPrivateLink = asyncHandler(async (req: Request, res: Response) => {
	const { title, note } = req.body;
	if (!title || typeof title !== "string") {
		throw new AppError("Title is required", 400);
	}

	const token = generateLinkToken();
	const link = await PrivateLink.create({
		tokenHash: hashLinkToken(token),
		title,
		note,
		items: await parseItems(req.body.items),
		expiresAt: parseExpiry(req.body, true),
		maxUses: parseMaxUses(req.body.maxUses) ?? null,
		createdBy: req.user!.id,
	});

	await logLinkEvent({ link: link._id as any, action: "created", actor: req.user!.id as any, ip: getRealClientIp(req) });

	// The raw token/url is only ever returned here
	res.status(201).json({ ...link.toJSON(), token, url: linkUrl(token) });
});

// @desc    List private links
// @route   GET /api/private-links?status=active|expired|revoked|exhausted
// @access  Private (Admin/Staff)
export const getPrivateLinks = asyncHandler(async (req: Request, res: Response) => {
	const links = await PrivateLink.find()
		.sort({ createdAt: -1 })
		.populate("createdBy", "firstName lastName role")
		.populate("items.product", "name images sku visibility");
	const { status } = req.query;
	const result = status ? links.filter((link) => link.status === status) : links;
	res.status(200).json(result);
});

// @desc    Get a private link with its audit events and orders
// @route   GET /api/private-links/:id
// @access  Private (Admin/Staff)
export const getPrivateLink = asyncHandler(async (req: Request, res: Response) => {
	if (!mongoose.isValidObjectId(req.params.id)) {
		throw new AppError("Private link not found", 404);
	}
	const link = await PrivateLink.findById(req.params.id)
		.populate("createdBy", "firstName lastName role")
		.populate("revokedBy", "firstName lastName role")
		.populate("items.product", "name images sku price stockCount visibility isActive");
	if (!link) {
		throw new AppError("Private link not found", 404);
	}
	const [events, orders] = await Promise.all([
		PrivateLinkEvent.find({ link: link._id }).sort({ createdAt: -1 }).limit(200).populate("actor", "firstName lastName role"),
		Order.find({ privateLink: link._id }).select("orderNumber status paymentStatus total createdAt notes"),
	]);
	res.status(200).json({ ...link.toJSON(), events, orders });
});

// @desc    Update a private link (title, note, items, expiry, maxUses)
// @route   PATCH /api/private-links/:id
// @access  Private (Admin/Staff)
export const updatePrivateLink = asyncHandler(async (req: Request, res: Response) => {
	if (!mongoose.isValidObjectId(req.params.id)) {
		throw new AppError("Private link not found", 404);
	}
	const link = await PrivateLink.findById(req.params.id);
	if (!link) {
		throw new AppError("Private link not found", 404);
	}
	if (link.revokedAt) {
		throw new AppError("Revoked links cannot be edited", 400);
	}

	const changed: string[] = [];
	if (req.body.title !== undefined) {
		link.title = req.body.title;
		changed.push("title");
	}
	if (req.body.note !== undefined) {
		link.note = req.body.note;
		changed.push("note");
	}
	if (req.body.items !== undefined) {
		link.set("items", await parseItems(req.body.items));
		changed.push("items");
	}
	const expiresAt = parseExpiry(req.body, false);
	if (expiresAt) {
		link.expiresAt = expiresAt;
		changed.push("expiresAt");
	}
	const maxUses = parseMaxUses(req.body.maxUses);
	if (maxUses !== undefined) {
		link.maxUses = maxUses;
		changed.push("maxUses");
	}

	await link.save();
	await logLinkEvent({
		link: link._id as any,
		action: "updated",
		actor: req.user!.id as any,
		ip: getRealClientIp(req),
		details: { changed },
	});
	res.status(200).json(link);
});

// @desc    Revoke a private link immediately
// @route   POST /api/private-links/:id/revoke
// @access  Private (Admin/Staff)
export const revokePrivateLink = asyncHandler(async (req: Request, res: Response) => {
	if (!mongoose.isValidObjectId(req.params.id)) {
		throw new AppError("Private link not found", 404);
	}
	const link = await PrivateLink.findOneAndUpdate(
		{ _id: req.params.id, revokedAt: null },
		{ revokedAt: new Date(), revokedBy: req.user!.id },
		{ new: true },
	);
	if (!link) {
		throw new AppError("Private link not found or already revoked", 404);
	}
	await logLinkEvent({ link: link._id as any, action: "revoked", actor: req.user!.id as any, ip: getRealClientIp(req) });
	res.status(200).json(link);
});

// @desc    Resolve a private link token to its preset cart
// @route   GET /api/private-links/resolve/:token
// @access  Public (rate limited)
export const resolvePrivateLink = asyncHandler(async (req: Request, res: Response) => {
	res.set("X-Robots-Tag", "noindex, nofollow");
	res.set("Cache-Control", "no-store");

	const { token } = req.params;
	// Uniform 404 for unknown, expired, revoked and used-up links
	const notFound = () => new AppError("This link is invalid or has expired", 404);
	if (!token || token.length > 100) {
		throw notFound();
	}

	const link = await PrivateLink.findOne({ tokenHash: hashLinkToken(token) }).populate("items.product");
	if (!link || link.status !== "active") {
		throw notFound();
	}

	const rate = await getExchangeRate();
	const items = [];
	for (const item of link.items as any[]) {
		const product = item.product;
		if (!product || !product.isActive) {
			items.push({ available: false, quantity: item.quantity, size: item.size, color: item.color });
			continue;
		}
		const converted = await convertProductPrices(product);
		items.push({
			product: {
				id: converted.id,
				name: converted.name,
				description: converted.description,
				images: converted.images,
				price: converted.price,
				priceNGN: converted.priceNGN,
				category: converted.category,
			},
			size: item.size,
			color: item.color,
			quantity: item.quantity,
			lineTotalNGN: Math.round(product.price * rate) * item.quantity,
			available: product.stockCount >= item.quantity,
		});
	}

	await logLinkEvent({ link: link._id as any, action: "resolved", ip: getRealClientIp(req) });

	res.status(200).json({
		title: link.title,
		note: link.note,
		expiresAt: link.expiresAt,
		items,
	});
});
