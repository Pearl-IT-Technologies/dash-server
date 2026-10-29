import { AppError } from "../utils/AppError";
import { Request, Response } from "express";
import { Receiving } from "../models/Receiving";
import { asyncHandler } from "../utils/asyncHandler";
import Product from "../models/Product";
import { emitInventoryUpdate } from "../utils/realtime";

// @desc    Record new stock received
// @route   POST /api/receiving
// @access  Private/Admin or Storekeeper
export const recordReceiving = asyncHandler(async (req: Request, res: Response) => {
	const { productId, note } = req.body;
	// Coerce: a string quantity would otherwise concatenate ("10" + 5 -> "105")
	const quantity = Number(req.body.quantity);

	if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
		throw new AppError("Product ID and a positive whole quantity are required.", 400);
	}

	const product = await Product.findById(productId);
	if (!product) {
		throw new AppError("Product not found.", 404);
	}

	// Create receiving record
	const receiving = await Receiving.create({
		product: product._id,
		quantity,
		note,
		receivedBy: req.user ? req.user.id : null, // from auth middleware
	});

	// Update product stock
	const updated = await Product.findByIdAndUpdate(
		product._id,
		{ $inc: { stockCount: quantity }, $set: { inStock: true } },
		{ new: true },
	);

	await emitInventoryUpdate(updated);

	res.status(201).json({
		success: true,
		message: "Stock received and updated successfully.",
		receiving,
	});
});

// @desc    Get recent receiving records
// @route   GET /api/receiving/recent
// @access  Private/Storekeeper
export const getRecentReceiving = asyncHandler(async (req: Request, res: Response) => {
	const { limit = 20 } = req.query;

	const receiving = await Receiving.find()
		.populate({
			path: "product",
			select: "name category",
		})
		.populate({
			path: "receivedBy",
			select: "firstName lastName",
		})
		.sort({ receivedAt: -1 })
		.limit(parseInt(limit as string, 10));

	res.status(200).json({
		success: true,
		count: receiving.length,
		receiving,
	});
});