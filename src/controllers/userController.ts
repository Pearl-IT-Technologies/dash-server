import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import User from "../models/User";
import Product from "../models/Product";
import { LoginHistory } from "../models/LoginHistory";

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	res.status(200).json({
		success: true,
		user: {
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			role: user.role,
			avatar: user.avatar,
			phone: user.phone,
			addresses: user.addresses,
			preferences: user.preferences,
			wishlist: user.wishlist,
			lastLogin: user.lastLogin,
			createdAt: user.createdAt,
		},
	});
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
export const updateDetails = asyncHandler(async (req: Request, res: Response) => {
	const fieldsToUpdate = {
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		username: req.body.username,
		email: req.body.email,
		phone: req.body.phone,
		dateOfBirth: req.body.dateOfBirth,
		gender: req.body.gender,
		avatar: req.body.avatar,
	};

	// Remove undefined fields
	Object.keys(fieldsToUpdate).forEach((key) => {
		if (fieldsToUpdate[key as keyof typeof fieldsToUpdate] === undefined) {
			delete fieldsToUpdate[key as keyof typeof fieldsToUpdate];
		}
	});

	const user = await User.findByIdAndUpdate(req.user?.id, fieldsToUpdate, {
		new: true,
		runValidators: true,
	});

	if (!user) {
		throw new AppError("User not found", 404);
	}

	res.status(200).json({
		success: true,
		user: {
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			role: user.role,
			avatar: user.avatar,
			phone: user.phone,
			addresses: user.addresses,
			preferences: user.preferences,
			wishlist: user.wishlist,
			lastLogin: user.lastLogin,
			createdAt: user.createdAt,
		},
	});
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
	const { currentPassword, newPassword } = req.body;
	const userId = req.user?.id;

	// Get user with password
	const user = await User.findById(userId).select("+password");

	if (!user) {
		throw new AppError("User not found", 404);
	}

	// Check current password
	const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);

	if (!isCurrentPasswordCorrect) {
		throw new AppError("Current password is incorrect", 400);
	}

	// Update password (will be hashed by pre-save middleware)
	user.password = newPassword;
	await user.save();

	res.status(200).json({
		success: true,
		message: "Password changed successfully",
	});
});

// @desc    Update preferences
// @route   PUT /api/auth/preferences
// @access  Private
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	user.preferences = { ...user.preferences, ...req.body };
	await user.save();

	res.status(200).json({
		success: true,
		preferences: user.preferences,
	});
});

// @desc    Delete user account
// @route   DELETE /api/auth/deleteaccount
// @access  Private
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	// Optional: Require password confirmation for security
	if (req.body.confirmPassword) {
		const isPasswordMatch = await user.comparePassword(req.body.confirmPassword);
		if (!isPasswordMatch) {
			throw new AppError("Password confirmation is incorrect", 400);
		}
	}

	await User.findByIdAndDelete(req.user?.id);

	res.status(200).json({
		success: true,
		message: "Account successfully deleted",
	});
});

// @desc    Upload/Update avatar
// @route   PUT /api/auth/avatar
// @access  Private
export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	if (!req.body.avatar) {
		throw new AppError("Avatar URL is required", 400);
	}

	user.avatar = req.body.avatar;
	await user.save();

	res.status(200).json({
		success: true,
		avatar: user.avatar,
		message: "Avatar updated successfully",
	});
});

// ========== WISHLIST MANAGEMENT ==========

// @desc    Get user's wishlist with product details
// @route   GET /api/auth/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
	const userId = req.user?.id;

	const user = await User.findById(userId).populate({
		path: "wishlist",
		match: { isActive: true },
		select: "name price images category stockCount inStock discountPercentage originalPrice sku",
	});

	if (!user) {
		throw new AppError("User not found", 404);
	}

	res.status(200).json({
		success: true,
		wishlist: user.wishlist,
		count: user.wishlist.length,
	});
});

// @desc    Toggle product in wishlist
// @route   POST /api/auth/wishlist/toggle
// @access  Private
export const toggleWishlist = asyncHandler(async (req: Request, res: Response) => {
	const { productId } = req.body;
	const userId = req.user?.id;

	if (!productId) {
		throw new AppError("Product ID is required", 400);
	}

	// Check if product exists and is active
	const product = await Product.findOne({ _id: productId, isActive: true });
	if (!product) {
		throw new AppError("Product not found or is inactive", 404);
	}

	const user = await User.findById(userId);
	if (!user) {
		throw new AppError("User not found", 404);
	}

	let message: string;
	let action: string;
	let inWishlist: boolean;

	if (user.wishlist.includes(productId)) {
		// Remove from wishlist
		user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
		message = "Product removed from wishlist";
		action = "removed";
		inWishlist = false;
	} else {
		// Add to wishlist
		user.wishlist.push(productId);
		message = "Product added to wishlist";
		action = "added";
		inWishlist = true;
	}

	await user.save();

	res.status(200).json({
		success: true,
		message,
		action,
		inWishlist,
		wishlist: user.wishlist,
		count: user.wishlist.length,
	});
});

// @desc    Clear wishlist
// @route   DELETE /api/auth/wishlist
// @access  Private
export const clearWishlist = asyncHandler(async (req: Request, res: Response) => {
	const userId = req.user?.id;

	const user = await User.findById(userId);
	if (!user) {
		throw new AppError("User not found", 404);
	}

	user.wishlist = [];
	await user.save();

	res.status(200).json({
		success: true,
		message: "Wishlist cleared successfully",
		wishlist: [],
		count: 0,
	});
});

// @desc    Sync local wishlist with user account
// @route   POST /api/auth/wishlist/sync
// @access  Private
export const syncWishlist = asyncHandler(async (req: Request, res: Response) => {
	const { userId, ids } = req.body;
	const authenticatedUserId = req.user?.id;

	if (!userId || !ids) {
		throw new AppError("User ID and product IDs are required", 400);
	}

	if (userId !== authenticatedUserId) {
		throw new AppError("You can only sync your own wishlist", 403);
	}

	if (!Array.isArray(ids)) {
		throw new AppError("Product IDs must be an array", 400);
	}

	const user = await User.findById(userId);
	if (!user) {
		throw new AppError("User not found", 404);
	}

	console.log(ids);

	const validProductIds = [];
	const invalidProductIds = [];

	for (const productId of ids) {
		const product = await Product.findOne({ _id: productId.toString(), isActive: true });
		if (product) {
			validProductIds.push(productId.toString());
		} else {
			invalidProductIds.push(productId.toString());
		}
	}

	// Overwrite user's wishlist to reflect client state
	user.wishlist = [...new Set(validProductIds)];
	await user.save();

	res.status(200).json({
		success: true,
		message: "Wishlist synced successfully",
		wishlist: user.wishlist || [],
	});
});

// ========== ADMIN ROUTES ==========

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 20;
	const skip = (page - 1) * limit;

	// Build filter object
	const filter: any = {};

	if (req.query.role) {
		filter.role = req.query.role;
	}

	if (req.query.isActive !== undefined) {
		filter.isActive = req.query.isActive === "true";
	}

	if (req.query.search) {
		filter.$or = [
			{ firstName: { $regex: req.query.search, $options: "i" } },
			{ lastName: { $regex: req.query.search, $options: "i" } },
			{ email: { $regex: req.query.search, $options: "i" } },
			{ username: { $regex: req.query.search, $options: "i" } },
		];
	}

	const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit);

	const total = await User.countDocuments(filter);

	res.status(200).json({
		success: true,
		count: users.length,
		total,
		currentPage: page,
		totalPages: Math.ceil(total / limit),
		users: users.map((user) => ({
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			avatar: user.avatar,
			phone: user.phone,
			lastLogin: user.lastLogin,
			createdAt: user.createdAt,
		})),
	});
});

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.params.id)
		.select("-password")
		.populate("wishlist", "name price images category sku");

	if (!user) {
		throw new AppError("User not found", 404);
	}

	res.status(200).json({
		success: true,
		user: {
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			avatar: user.avatar,
			phone: user.phone,
			dateOfBirth: user.dateOfBirth,
			gender: user.gender,
			addresses: user.addresses,
			preferences: user.preferences,
			wishlist: user.wishlist,
			lastLogin: user.lastLogin,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
	});
});

// @desc    Create new user (Admin)
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req: Request, res: Response) => {
	const { firstName, lastName, username, email, password, role, phone, isActive } = req.body;

	// Check if user already exists
	const existingUser = await User.findOne({
		$or: [{ email }, { username }],
	});

	if (existingUser) {
		throw new AppError("User with this email or username already exists", 400);
	}

	const user = await User.create({
		firstName,
		lastName,
		username,
		email,
		password, // Will be hashed by pre-save middleware
		role: role || "customer",
		phone,
		isActive: isActive !== undefined ? isActive : true,
		wishlist: [],
	});

	// Remove password from response
	const userResponse = await User.findById(user._id).select("-password");

	res.status(201).json({
		success: true,
		user: userResponse,
	});
});

// @desc    Update user by ID (Admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUserById = asyncHandler(async (req: Request, res: Response) => {
	const fieldsToUpdate = {
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		username: req.body.username,
		email: req.body.email,
		role: req.body.role,
		isActive: req.body.isActive,
		phone: req.body.phone,
		dateOfBirth: req.body.dateOfBirth,
		gender: req.body.gender,
	};

	// Remove undefined fields
	Object.keys(fieldsToUpdate).forEach((key) => {
		if (fieldsToUpdate[key as keyof typeof fieldsToUpdate] === undefined) {
			delete fieldsToUpdate[key as keyof typeof fieldsToUpdate];
		}
	});

	// Check if email/username already exists for another user
	if (fieldsToUpdate.email || fieldsToUpdate.username) {
		const existingUser = await User.findOne({
			$and: [
				{ _id: { $ne: req.params.id } },
				{ $or: [{ email: fieldsToUpdate.email }, { username: fieldsToUpdate.username }] },
			],
		});

		if (existingUser) {
			throw new AppError("Email or username already exists", 400);
		}
	}

	const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
		new: true,
		runValidators: true,
	}).select("-password");

	if (!user) {
		throw new AppError("User not found", 404);
	}

	res.status(200).json({
		success: true,
		user: {
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			avatar: user.avatar,
			phone: user.phone,
		},
	});
});

// @desc    Delete user by ID (Admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUserById = asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.params.id);

	if (!user) {
		throw new AppError("User not found", 404);
	}

	// Prevent admin from deleting themselves
	if (user.id.toString() === req.user?.id) {
		throw new AppError("You cannot delete your own account", 400);
	}

	// Soft delete - mark as inactive instead of hard delete
	user.isActive = false;
	await user.save();

	res.status(200).json({
		success: true,
		message: "User successfully deactivated",
	});
});

// @desc    Get user statistics
// @route   GET /api/admin/users/stats
// @access  Private/Admin
export const getUserStats = asyncHandler(async (req: Request, res: Response) => {
	const totalUsers = await User.countDocuments();
	const activeUsers = await User.countDocuments({ isActive: true });
	const inactiveUsers = await User.countDocuments({ isActive: false });

	const usersByRole = await User.aggregate([
		{
			$group: {
				_id: "$role",
				count: { $sum: 1 },
			},
		},
	]);

	// Users registered in the last 30 days
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const recentUsers = await User.countDocuments({
		createdAt: { $gte: thirtyDaysAgo },
	});

	// Users who logged in within the last 7 days
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const recentlyActiveUsers = await User.countDocuments({
		lastLogin: { $gte: sevenDaysAgo },
	});

	// Recent users list
	const recentUsersList = await User.find().select("-password").sort({ createdAt: -1 }).limit(5);

	res.status(200).json({
		success: true,
		stats: {
			total: totalUsers,
			active: activeUsers,
			inactive: inactiveUsers,
			recentRegistrations: recentUsers,
			recentlyActive: recentlyActiveUsers,
			usersByRole: usersByRole.reduce((acc, item) => {
				acc[item._id] = item.count;
				return acc;
			}, {}),
			recentUsers: recentUsersList,
		},
	});
});

// @desc    Bulk update users
// @route   PUT /api/admin/users/bulk-update
// @access  Private/Admin
export const bulkUpdateUsers = asyncHandler(async (req: Request, res: Response) => {
	const { userIds, updateData } = req.body;

	if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
		throw new AppError("Please provide valid user IDs", 400);
	}

	const result = await User.updateMany({ _id: { $in: userIds } }, updateData, { runValidators: true });

	res.status(200).json({
		success: true,
		message: `Successfully updated ${result.modifiedCount} users`,
		modifiedCount: result.modifiedCount,
	});
});

// @desc    Search users
// @route   GET /api/admin/users/search
// @access  Private/Admin
export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
	const { q, role, isActive } = req.query;

	let query: any = {};

	// Text search
	if (q) {
		query.$or = [
			{ firstName: { $regex: q, $options: "i" } },
			{ lastName: { $regex: q, $options: "i" } },
			{ email: { $regex: q, $options: "i" } },
			{ username: { $regex: q, $options: "i" } },
		];
	}

	// Role filter
	if (role) {
		query.role = role;
	}

	// Active status filter
	if (isActive !== undefined) {
		query.isActive = isActive === "true";
	}

	const users = await User.find(query).select("-password").sort({ createdAt: -1 }).limit(50); // Limit results for performance

	res.status(200).json({
		success: true,
		count: users.length,
		users,
	});
});

// @desc    Get login history
// @route   GET /api/admin/login-history
// @access  Private/Admin
export const getLoginHistory = asyncHandler(async (req: Request, res: Response) => {
	const { limit = 500, dateRange = "week", status, search } = req.query;

	// Build date filter based on dateRange
	const now = new Date();
	let startDate: Date;

	switch (dateRange) {
		case "day":
			startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			break;
		case "week":
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case "month":
			startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
		case "quarter":
			startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
			break;
		default:
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	}

	// Build query filters
	let query: any = {
		timestamp: { $gte: startDate },
	};

	// Filter by success status
	if (status === "success") {
		query.success = true;
	} else if (status === "failed") {
		query.success = false;
	}

	// Search functionality
	if (search) {
		// Search for users by name or email
		const searchRegex = new RegExp(search as string, "i");
		const users = await User.find({
			$or: [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }],
		}).select("_id");

		const userIds = users.map((user) => user._id);

		// Also search by IP address
		query.$or = [{ userId: { $in: userIds } }, { ipAddress: { $regex: searchRegex } }];
	}

	// Fetch login history with user details
	const loginHistory = await LoginHistory.find(query)
		.populate({
			path: "userId",
			select: "firstName lastName email role",
		})
		.sort({ timestamp: -1 })
		.limit(parseInt(limit as string, 10));

	res.status(200).json({
		success: true,
		count: loginHistory.length,
		loginHistory,
	});
});
