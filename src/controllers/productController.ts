// controllers/productController.ts
import { Request, Response } from "express";
import Product from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { io } from "../index";
import { convertProductsPrices, convertProductPrices } from "../utils/currencyHelper";

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
	const products = await Product.find({ isActive: true });
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

	const product = await Product.findOne({
		_id: id,
		isActive: true,
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
	const product = await Product.create(req.body);
	const convertedProduct = await convertProductPrices(product);

	// Emit real-time update
	io.emit("product-created", convertedProduct);
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

	const product = await Product.findByIdAndUpdate(id, req.body, {
		new: true,
		runValidators: true,
	});

	if (!product) {
		throw new AppError("Product not found", 404);
	}

	const convertedProduct = await convertProductPrices(product);
	io.emit("inventory-updated", convertedProduct);
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

	io.emit("product-deleted", product.id);

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
	io.emit("inventory-updated", convertedProduct);
	res.status(200).json(convertedProduct);
});

// @desc    Get all unique categories
// @route   GET /api/products/categories
// @access  Public
export const getProductCategories = asyncHandler(async (req: Request, res: Response) => {
	const categories = await Product.distinct("category", { isActive: true });

	res.status(200).json(categories);
});