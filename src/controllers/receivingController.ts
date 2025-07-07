import { Request, Response } from "express";
import { Receiving } from "../models/Receiving";
import { asyncHandler } from "@/utils/asyncHandler";
import Product from "@/models/Product";

// @desc    Record new stock received
// @route   POST /api/receiving
// @access  Private/Admin or Storekeeper
export const recordReceiving = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity, note } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error("Product ID and positive quantity are required.");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  // Create receiving record
  const receiving = await Receiving.create({
    product: product._id,
    quantity,
    note,
    receivedBy: req.user ? req.user.id : null, // from auth middleware
  });

  // Update product stock
  product.stockCount += quantity;
  await product.save();

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