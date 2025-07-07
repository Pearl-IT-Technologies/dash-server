import { Request, Response } from "express";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { loginAlertMail, welcomeMail } from "@/services/emailService";
import { LoginHistory } from "@/models/LoginHistory";
import { getRealClientIp } from "@/utils/GetIp";
import { sendTokenResponse } from "@/utils/JWTHelper";


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response) => {
	const { firstName, lastName, email, password, username } = req.body;

	// Check if user exists
	const existingUser = await User.findOne({ email: email.toLowerCase() });
	if (existingUser) {
		throw new AppError("User already exists with this email", 400);
	}

	// Create user
	const user = await User.create({
		firstName: firstName.trim(),
		lastName: lastName.trim(),
		username: username.trim(),
		email: email.toLowerCase().trim(),
		password,
	});

	// Update last login
	user.lastLogin = new Date();
  await user.save();
  await welcomeMail(user.email);

	sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = getRealClientIp(req);

	// Validate input
	if (!email || !password) {
		throw new AppError("Please provide email and password", 400);
	}

	// Check for user and include password
	const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

	if (!user) {
		throw new AppError("Invalid credentials", 401);
	}

	// Check if user is active
	if (!user.isActive) {
		throw new AppError("Account has been deactivated", 401);
	}

	// Check if password matches
  const isMatch = await user.comparePassword(password);
  
  const loginEntry = new LoginHistory({
    userId: user?._id,
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
    success: isMatch,
  });

  await loginEntry.save();

	if (!isMatch) {
		throw new AppError("Invalid credentials", 401);
	}

	// Update last login
	user.lastLogin = new Date();
  await user.save();
  await loginAlertMail(user.email, ip);

	sendTokenResponse(user, 200, res);
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
	const { currentPassword, newPassword } = req.body;

	if (!currentPassword || !newPassword) {
		throw new AppError("Please provide current and new password", 400);
	}

	const user = await User.findById(req.user?.id).select("+password");

	if (!user) {
		throw new AppError("User not found", 404);
	}

	// Check current password
	const isMatch = await user.comparePassword(currentPassword);
	if (!isMatch) {
		throw new AppError("Current password is incorrect", 401);
	}

	user.password = newPassword;
	await user.save();

	sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: Request, res: Response) => {
	res.cookie("token", "none", {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});

	res.status(200).json({
		success: true,
		message: "Logged out successfully",
	});
});

// @desc    Add address
// @route   POST /api/auth/addresses
// @access  Private
export const addAddress = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	const { type, street, city, state, zipCode, country, isDefault } = req.body;

	const newAddress = {
		type,
		street,
		city,
		state,
		zipCode,
		country: country || "Nigeria",
		isDefault: isDefault || false,
	};

	// If this is set as default, make sure no other address of the same type is default
	if (isDefault) {
		user.addresses.forEach((address) => {
			if (address.type === type) {
				address.isDefault = false;
			}
		});
	}

	user.addresses.push(newAddress);
	await user.save();

	res.status(201).json({
		success: true,
		addresses: user.addresses,
	});
});

// @desc    Update address
// @route   PUT /api/auth/addresses/:addressId
// @access  Private
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	// Find address using find() method
	const address = user.addresses.find((addr) => addr._id?.toString() === req.params.addressId);
	if (!address) {
		throw new AppError("Address not found", 404);
	}

	// Update address fields
	Object.assign(address, req.body);

	// If this is set as default, make sure no other address of the same type is default
	if (req.body.isDefault) {
		user.addresses.forEach((addr) => {
			if (addr.type === address.type && addr._id!.toString() !== address._id!.toString()) {
				addr.isDefault = false;
			}
		});
	}

	await user.save();

	res.status(200).json({
		success: true,
		addresses: user.addresses,
	});
});

// @desc    Delete address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === req.params.addressId);

	if (addressIndex === -1) {
		throw new AppError("Address not found", 404);
	}

	user.addresses.splice(addressIndex, 1);
	await user.save();

	res.status(200).json({
		success: true,
		addresses: user.addresses,
	});
});
