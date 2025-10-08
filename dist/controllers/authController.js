"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.logout = exports.updatePassword = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const emailService_1 = require("../services/emailService");
const LoginHistory_1 = require("../models/LoginHistory");
const GetIp_1 = require("../utils/GetIp");
const JWTHelper_1 = require("../utils/JWTHelper");
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
    await (0, emailService_1.welcomeMail)(user.email);
    (0, JWTHelper_1.sendTokenResponse)(user, 201, res);
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const ip = (0, GetIp_1.getRealClientIp)(req);
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
    const loginEntry = new LoginHistory_1.LoginHistory({
        userId: user?._id,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        success: isMatch,
    });
    await loginEntry.save();
    if (!isMatch) {
        throw new AppError_1.AppError("Invalid credentials", 401);
    }
    user.lastLogin = new Date();
    await user.save();
    await (0, emailService_1.loginAlertMail)(user.email, ip);
    (0, JWTHelper_1.sendTokenResponse)(user, 200, res);
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
    (0, JWTHelper_1.sendTokenResponse)(user, 200, res);
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