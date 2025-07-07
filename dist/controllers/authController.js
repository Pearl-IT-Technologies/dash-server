"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.logout = exports.updatePassword = exports.login = exports.register = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id.toString());
    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    };
    res
        .status(statusCode)
        .cookie("token", token, options)
        .json({
        success: true,
        token,
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
};
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { firstName, lastName, email, password, username } = req.body;
    const existingUser = await User_1.default.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new AppError_1.AppError("User already exists with this email", 400);
    }
    const user = await User_1.default.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password,
    });
    user.lastLogin = new Date();
    await user.save();
    sendTokenResponse(user, 201, res);
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError_1.AppError("Please provide email and password", 400);
    }
    const user = await User_1.default.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
        throw new AppError_1.AppError("Invalid credentials", 401);
    }
    if (!user.isActive) {
        throw new AppError_1.AppError("Account has been deactivated", 401);
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new AppError_1.AppError("Invalid credentials", 401);
    }
    user.lastLogin = new Date();
    await user.save();
    sendTokenResponse(user, 200, res);
});
exports.updatePassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new AppError_1.AppError("Please provide current and new password", 400);
    }
    const user = await User_1.default.findById(req.user?.id).select("+password");
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new AppError_1.AppError("Current password is incorrect", 401);
    }
    user.password = newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.cookie("token", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
});
exports.addAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
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
exports.updateAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    const address = user.addresses.find((addr) => addr._id?.toString() === req.params.addressId);
    if (!address) {
        throw new AppError_1.AppError("Address not found", 404);
    }
    Object.assign(address, req.body);
    if (req.body.isDefault) {
        user.addresses.forEach((addr) => {
            if (addr.type === address.type && addr._id.toString() !== address._id.toString()) {
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
exports.deleteAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.id);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === req.params.addressId);
    if (addressIndex === -1) {
        throw new AppError_1.AppError("Address not found", 404);
    }
    user.addresses.splice(addressIndex, 1);
    await user.save();
    res.status(200).json({
        success: true,
        addresses: user.addresses,
    });
});
//# sourceMappingURL=authController.js.map