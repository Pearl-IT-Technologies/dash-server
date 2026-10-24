// controllers/productController.ts
import { Request, Response } from "express";
import Product from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import mongoose from "mongoose";
import { convertProductsPrices, convertProductPrices } from "../utils/currencyHelper";
import { emitProductEvent, emitProductDeleted } from "../utils/realtime";
import { PUBLIC_PRODUCT_FILTER } from "../utils/productVisibility";

// Fields staff may set through create/update. Ratings, review counts, ids and
// timestamps are system-managed and are ignored if sent.
const WRITABLE_PRODUCT_FIELDS = [
	"name",
	"description",
	"price",
	"originalPrice",
	"images",
	"category",
	"subcategory",
	"gender",
	"sizes",
	"colors",
	"stockCount",
	"features",
	"isNewProduct",
	"isFeatured",
	"isActive",
	"visibility",
	"tags",
	"sku",
	"weight",
	"dimensions",
	"seoTitle",
	"seoDescription",
] as const;

const pickProductFields = (body: any) => {
	const data: Record<string, any> = {};
	for (const field of WRITABLE_PRODUCT_FIELDS) {
		if (body && body[field] !== undefined) data[field] = body[field];
	}
	return data;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
	const products = await Product.find(PUBLIC_PRODUCT_FILTER);
	const convertedProducts = await convertProductsPrices(products);
	
	res.status(200).json(convertedProducts);
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) {
		throw new AppError("Invalid product ID", 400);
	}

	if (!mongoose.isValidObjectId(id)) {
		throw new AppError("Product not found", 404);
	}

	const product = await Product.findOne({
		_id: id,
		...PUBLIC_PRODUCT_FILTER,
	});

	if (!product) {
		throw new AppError("Product not found", 404);
	}

	const convertedProduct = await convertProductPrices(product);
	res.status(200).json(convertedProduct);
});


// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin/Staff)
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
	const product = await Product.create(pickProductFields(req.body));
	const convertedProduct = await convertProductPrices(product);

	// Emit real-time update
	emitProductEvent("product-created", convertedProduct);
	res.status(201).json(convertedProduct);
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin/Staff)
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) {
		throw new AppError("Invalid product ID", 400);
	}

	const updateData = pickProductFields(req.body);
	// Keep inStock in sync (the pre-save hook doesn't run on findByIdAndUpdate)
	if (typeof updateData.stockCount === "number") {
		updateData.inStock = updateData.stockCount > 0;
	}

	const product = await Product.findByIdAndUpdate(id, updateData, {
		new: true,
		runValidators: true,
	});

	if (!product) {
		throw new AppError("Product not found", 404);
	}

	const convertedProduct = await convertProductPrices(product);
	emitProductEvent("inventory-updated", convertedProduct);
	res.status(200).json(convertedProduct);
});

// @desc    Delete product permanently
// @route   DELETE /api/products/:id
// @access  Private (Admin)
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) {
		throw new AppError("Invalid product ID", 400);
	}

	const product = await Product.findById(id);

	if (!product) {
		throw new AppError("Product not found", 404);
  }

	await product.deleteOne();

	emitProductDeleted(product);

	res.status(200).json({
		success: true,
		message: "Product deleted permanently",
	});
});

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private (Admin/Staff)
export const updateProductStock = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) {
		throw new AppError("Invalid product ID", 400);
	}

	const { stockCount } = req.body;

	const product = await Product.findByIdAndUpdate(
		id,
		{
			stockCount,
			inStock: stockCount > 0,
		},
		{
			new: true,
			runValidators: true,
		},
	);

	if (!product) {
		throw new AppError("Product not found", 404);
	}

	const convertedProduct = await convertProductPrices(product);
	emitProductEvent("inventory-updated", convertedProduct);
	res.status(200).json(convertedProduct);
});

// @desc    Get all unique categories
// @route   GET /api/products/categories
// @access  Public
export const getProductCategories = asyncHandler(async (req: Request, res: Response) => {
	const categories = await Product.distinct("category", PUBLIC_PRODUCT_FILTER);

	res.status(200).json(categories);
});

// @desc    Get all products including private and inactive ones
// @route   GET /api/products/admin/all
// @access  Private (Admin/Staff)
export const getAllProductsForStaff = asyncHandler(async (req: Request, res: Response) => {
	const filter: Record<string, any> = {};
	if (req.query.visibility === "public" || req.query.visibility === "private") {
		filter.visibility = req.query.visibility === "public" ? { $ne: "private" } : "private";
	}
	const products = await Product.find(filter).sort({ createdAt: -1 });
	const convertedProducts = await convertProductsPrices(products);
	res.status(200).json(convertedProducts);
});

// @desc    Toggle product visibility (public / private sale)
// @route   PATCH /api/products/:id/visibility
// @access  Private (Admin/Staff)
export const updateProductVisibility = asyncHandler(async (req: Request, res: Response) => {
	const { visibility } = req.body;
	if (visibility !== "public" && visibility !== "private") {
		throw new AppError("visibility must be 'public' or 'private'", 400);
	}

	const product = await Product.findByIdAndUpdate(req.params.id, { visibility }, { new: true, runValidators: true });
	if (!product) {
		throw new AppError("Product not found", 404);
	}

	const convertedProduct = await convertProductPrices(product);
	if (visibility === "private") {
		// Remove it from public storefronts that hold it in memory
		emitProductDeleted({ id: product.id, visibility: "public", isActive: true });
	}
	emitProductEvent("inventory-updated", convertedProduct);
	res.status(200).json(convertedProduct);
});
