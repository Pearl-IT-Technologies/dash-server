"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.bulkUpdateUsers = exports.getUserStats = exports.deleteUserById = exports.updateUserById = exports.createUser = exports.getUserById = exports.getAllUsers = exports.syncWishlist = exports.clearWishlist = exports.toggleWishlist = exports.getWishlist = exports.updateAvatar = exports.deleteAccount = exports.updatePreferences = exports.changePassword = exports.updateDetails = exports.getMe = void 0;
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
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
exports.updateDetails = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
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
    Object.keys(fieldsToUpdate).forEach((key) => {
        if (fieldsToUpdate[key] === undefined) {
            delete fieldsToUpdate[key];
        }
    });
    const user = await User_1.default.findByIdAndUpdate(req.user?.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
    });
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
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
exports.changePassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    const user = await User_1.default.findById(userId).select("+password");
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
        throw new AppError_1.AppError("Current password is incorrect", 400);
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password changed successfully",
    });
});
exports.updatePreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    user.preferences = { ...user.preferences, ...req.body };
    await user.save();
    res.status(200).json({
        success: true,
        preferences: user.preferences,
    });
});
exports.deleteAccount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    if (req.body.confirmPassword) {
        const isPasswordMatch = await user.comparePassword(req.body.confirmPassword);
        if (!isPasswordMatch) {
            throw new AppError_1.AppError("Password confirmation is incorrect", 400);
        }
    }
    await User_1.default.findByIdAndDelete(req.user?.id);
    res.status(200).json({
        success: true,
        message: "Account successfully deleted",
    });
});
exports.updateAvatar = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    if (!req.body.avatar) {
        throw new AppError_1.AppError("Avatar URL is required", 400);
    }
    user.avatar = req.body.avatar;
    await user.save();
    res.status(200).json({
        success: true,
        avatar: user.avatar,
        message: "Avatar updated successfully",
    });
});
exports.getWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const user = await User_1.default.findById(userId).populate({
        path: "wishlist",
        match: { isActive: true },
        select: "name price images category stockCount inStock discountPercentage originalPrice sku",
    });
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    res.status(200).json({
        success: true,
        wishlist: user.wishlist,
        count: user.wishlist.length,
    });
});
exports.toggleWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user?.id;
    if (!productId) {
        throw new AppError_1.AppError("Product ID is required", 400);
    }
    const product = await Product_1.default.findOne({ _id: productId, isActive: true });
    if (!product) {
        throw new AppError_1.AppError("Product not found or is inactive", 404);
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    let message;
    let action;
    let inWishlist;
    if (user.wishlist.includes(productId)) {
        user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
        message = "Product removed from wishlist";
        action = "removed";
        inWishlist = false;
    }
    else {
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
exports.clearWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
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
exports.syncWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId, ids } = req.body;
    const authenticatedUserId = req.user?.id;
    if (!userId || !ids) {
        throw new AppError_1.AppError("User ID and product IDs are required", 400);
    }
    if (userId !== authenticatedUserId) {
        throw new AppError_1.AppError("You can only sync your own wishlist", 403);
    }
    if (!Array.isArray(ids)) {
        throw new AppError_1.AppError("Product IDs must be an array", 400);
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    console.log(ids);
    const validProductIds = [];
    const invalidProductIds = [];
    for (const productId of ids) {
        const product = await Product_1.default.findOne({ _id: productId.toString(), isActive: true });
        if (product) {
            validProductIds.push(productId.toString());
        }
        else {
            invalidProductIds.push(productId.toString());
        }
    }
    user.wishlist = [...new Set(validProductIds)];
    await user.save();
    res.status(200).json({
        success: true,
        message: "Wishlist synced successfully",
        wishlist: user.wishlist || [],
    });
});
exports.getAllUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
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
    const users = await User_1.default.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await User_1.default.countDocuments(filter);
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
exports.getUserById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.params.id)
        .select("-password")
        .populate("wishlist", "name price images category sku");
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
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
exports.createUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { firstName, lastName, username, email, password, role, phone, isActive } = req.body;
    const existingUser = await User_1.default.findOne({
        $or: [{ email }, { username }],
    });
    if (existingUser) {
        throw new AppError_1.AppError("User with this email or username already exists", 400);
    }
    const user = await User_1.default.create({
        firstName,
        lastName,
        username,
        email,
        password,
        role: role || "customer",
        phone,
        isActive: isActive !== undefined ? isActive : true,
        wishlist: [],
    });
    const userResponse = await User_1.default.findById(user._id).select("-password");
    res.status(201).json({
        success: true,
        user: userResponse,
    });
});
exports.updateUserById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
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
    Object.keys(fieldsToUpdate).forEach((key) => {
        if (fieldsToUpdate[key] === undefined) {
            delete fieldsToUpdate[key];
        }
    });
    if (fieldsToUpdate.email || fieldsToUpdate.username) {
        const existingUser = await User_1.default.findOne({
            $and: [
                { _id: { $ne: req.params.id } },
                { $or: [{ email: fieldsToUpdate.email }, { username: fieldsToUpdate.username }] },
            ],
        });
        if (existingUser) {
            throw new AppError_1.AppError("Email or username already exists", 400);
        }
    }
    const user = await User_1.default.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
    }).select("-password");
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
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
exports.deleteUserById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.params.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    if (user.id.toString() === req.user?.id) {
        throw new AppError_1.AppError("You cannot delete your own account", 400);
    }
    user.isActive = false;
    await user.save();
    res.status(200).json({
        success: true,
        message: "User successfully deactivated",
    });
});
exports.getUserStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const totalUsers = await User_1.default.countDocuments();
    const activeUsers = await User_1.default.countDocuments({ isActive: true });
    const inactiveUsers = await User_1.default.countDocuments({ isActive: false });
    const usersByRole = await User_1.default.aggregate([
        {
            $group: {
                _id: "$role",
                count: { $sum: 1 },
            },
        },
    ]);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User_1.default.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
    });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyActiveUsers = await User_1.default.countDocuments({
        lastLogin: { $gte: sevenDaysAgo },
    });
    const recentUsersList = await User_1.default.find().select("-password").sort({ createdAt: -1 }).limit(5);
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
exports.bulkUpdateUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userIds, updateData } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError_1.AppError("Please provide valid user IDs", 400);
    }
    const result = await User_1.default.updateMany({ _id: { $in: userIds } }, updateData, { runValidators: true });
    res.status(200).json({
        success: true,
        message: `Successfully updated ${result.modifiedCount} users`,
        modifiedCount: result.modifiedCount,
    });
});
exports.searchUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q, role, isActive } = req.query;
    let query = {};
    if (q) {
        query.$or = [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
        ];
    }
    if (role) {
        query.role = role;
    }
    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }
    const users = await User_1.default.find(query).select("-password").sort({ createdAt: -1 }).limit(50);
    res.status(200).json({
        success: true,
        count: users.length,
        users,
    });
});
//# sourceMappingURL=userController.js.map