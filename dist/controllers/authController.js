"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.logout = exports.updatePassword = exports.resetPasswordWithOtp = exports.debugMailCheck = exports.requestPasswordResetOtp = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const asyncHandler_1 = require("../utils/asyncHandler");
const AppError_1 = require("../utils/AppError");
const emailService_1 = require("../services/emailService");
const LoginHistory_1 = require("../models/LoginHistory");
const GetIp_1 = require("../utils/GetIp");
const JWTHelper_1 = require("../utils/JWTHelper");
const crypto_1 = __importDefault(require("crypto"));
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
    void (0, emailService_1.welcomeMail)(user.email).catch((error) => {
        console.error(`Failed to send welcome email to ${user.email}`, error instanceof Error ? error.message : error);
    });
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
        userAgent: req.headers["user-agent"],
        success: isMatch,
    });
    await loginEntry.save();
    if (!isMatch) {
        throw new AppError_1.AppError("Invalid credentials", 401);
    }
    user.lastLogin = new Date();
    await user.save();
    void (0, emailService_1.loginAlertMail)(user.email, ip).catch((error) => {
        console.error(`Failed to send login alert email to ${user.email}`, error instanceof Error ? error.message : error);
    });
    (0, JWTHelper_1.sendTokenResponse)(user, 200, res);
});
exports.requestPasswordResetOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new AppError_1.AppError("Please provide an email address", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User_1.default.findOne({ email: normalizedEmail }).select("+resetPasswordOtpSentAt");
    if (!user) {
        res.status(200).json({
            success: true,
            message: "If an account exists for this email, a reset code has been sent.",
        });
        return;
    }
    const now = Date.now();
    if (user.resetPasswordOtpSentAt && now - user.resetPasswordOtpSentAt.getTime() < 60 * 1000) {
        throw new AppError_1.AppError("Please wait a minute before requesting another code", 429);
    }
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto_1.default.createHash("sha256").update(otpCode).digest("hex");
    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpires = new Date(now + 10 * 60 * 1000);
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordOtpSentAt = new Date(now);
    await user.save({ validateBeforeSave: false });
    void (0, emailService_1.passwordResetOtpMail)(user.email, otpCode).catch((error) => {
        console.error(`Failed to send password reset OTP email to ${user.email}`, error instanceof Error ? error.message : error);
    });
    res.status(200).json({
        success: true,
        message: "Reset code sent to your email",
    });
    return;
});
exports.debugMailCheck = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new AppError_1.AppError("Email is required", 400);
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User_1.default.findOne({ email: normalizedEmail }).select("_id email isActive");
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const result = (await (0, emailService_1.passwordResetOtpMail)(normalizedEmail, otpCode));
    if (result?.error) {
        throw new AppError_1.AppError(`SMTP send failed: ${result.error}`, 502);
    }
    res.status(200).json({
        success: true,
        message: "Mail diagnostic completed",
        diagnostics: {
            email: normalizedEmail,
            userExists: !!user,
            userId: user?._id ?? null,
            isActive: user?.isActive ?? null,
            smtp: {
                accepted: result?.accepted ?? [],
                rejected: result?.rejected ?? [],
                response: result?.response ?? null,
                messageId: result?.messageId ?? null,
            },
        },
    });
});
exports.resetPasswordWithOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        throw new AppError_1.AppError("Email, OTP, and new password are required", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User_1.default.findOne({ email: normalizedEmail }).select("+password +resetPasswordOtpHash +resetPasswordOtpExpires +resetPasswordOtpAttempts");
    if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpires) {
        throw new AppError_1.AppError("Invalid or expired reset code", 400);
    }
    if (user.resetPasswordOtpExpires.getTime() < Date.now()) {
        throw new AppError_1.AppError("Reset code has expired", 400);
    }
    if ((user.resetPasswordOtpAttempts || 0) >= 5) {
        throw new AppError_1.AppError("Too many failed attempts. Request a new code.", 429);
    }
    const normalizedOtp = String(otp).trim();
    const otpHash = crypto_1.default.createHash("sha256").update(normalizedOtp).digest("hex");
    if (otpHash !== user.resetPasswordOtpHash) {
        user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
        await user.save({ validateBeforeSave: false });
        throw new AppError_1.AppError("Invalid reset code", 400);
    }
    user.password = newPassword;
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordOtpSentAt = undefined;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password reset successful. You can now log in.",
    });
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