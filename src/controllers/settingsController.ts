import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import Setting from "../models/Setting";
import { clearExchangeRateCache } from "../utils/currencyHelper";
import { io } from "../index";
import mongoose from "mongoose";

// @desc    Get exchange rate settings
// @route   GET /api/settings/exchange-rate
// @access  Private (Admin/Storekeeper)
export const getExchangeRate = asyncHandler(async (req: Request, res: Response) => {
	let settings = await Setting.findOne().populate("updatedBy", "firstName lastName");

	// Create default settings if none exist
	if (!settings) {
		settings = await Setting.create({
			usdToNgnRate: 1650,
		});
		await settings.populate("updatedBy", "firstName lastName");
	}

	const responseData = {
		usdToNgnRate: settings.usdToNgnRate,
		lastUpdated: settings.lastUpdated,
		updatedBy: settings.updatedBy && typeof settings.updatedBy === 'object' && 'firstName' in settings.updatedBy && 'lastName' in settings.updatedBy
			? `${settings.updatedBy.firstName} ${settings.updatedBy.lastName}`
			: null,
	};

	res.status(200).json({
		success: true,
		settings: responseData,
	});
});

// @desc    Update exchange rate settings
// @route   POST /api/settings/exchange-rate
// @access  Private (Admin/Storekeeper)
export const updateExchangeRate = asyncHandler(async (req: Request, res: Response) => {
	const { usdToNgnRate } = req.body;

	if (!usdToNgnRate || usdToNgnRate <= 0) {
		throw new AppError("Exchange rate must be greater than 0", 400);
	}

	// Update or create settings
	let settings = await Setting.findOne();

	if (settings) {
		settings.usdToNgnRate = usdToNgnRate;
		settings.lastUpdated = new Date();
		settings.updatedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
		await settings.save();
	} else {
		settings = await Setting.create({
			usdToNgnRate,
			updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
		});
	}

	await settings.populate("updatedBy", "firstName lastName");

	// Clear the cache so new requests get the updated rate
	clearExchangeRateCache();

	// Emit real-time event to notify all clients about the rate change
	io.emit("exchange-rate-updated", {
		usdToNgnRate: settings.usdToNgnRate,
		lastUpdated: settings.lastUpdated,
		updatedBy: settings.updatedBy && typeof settings.updatedBy === 'object' && 'firstName' in settings.updatedBy && 'lastName' in settings.updatedBy
			? `${settings.updatedBy.firstName} ${settings.updatedBy.lastName}`
			: null,
	});

	const responseData = {
		usdToNgnRate: settings.usdToNgnRate,
		lastUpdated: settings.lastUpdated,
		updatedBy: settings.updatedBy && typeof settings.updatedBy === 'object' && 'firstName' in settings.updatedBy && 'lastName' in settings.updatedBy
			? `${settings.updatedBy.firstName} ${settings.updatedBy.lastName}`
			: null,
	};

	res.status(200).json({
		success: true,
		message: "Exchange rate updated successfully",
		settings: responseData,
	});
});