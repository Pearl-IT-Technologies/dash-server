"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
exports.protect = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    console.log("Protect middleware triggered");
    let token;
    console.log(req.headers.authorization);
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }
    if (!token) {
        throw new AppError_1.AppError("You are not logged in! Please log in to get access.", 401);
    }
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    const currentUser = await User_1.default.findById(decoded.userId);
    if (!currentUser) {
        throw new AppError_1.AppError("The user belonging to this token does no longer exist.", 401);
    }
    if (!currentUser.isActive) {
        throw new AppError_1.AppError("Your account has been deactivated. Please contact support.", 401);
    }
    req.user = {
        id: currentUser._id.toString(),
        role: currentUser.role,
    };
    next();
});
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new AppError_1.AppError("You do not have permission to perform this action", 403);
        }
        next();
    };
};
exports.restrictTo = restrictTo;
exports.optionalAuth = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const currentUser = await User_1.default.findById(decoded.userId);
            if (currentUser && currentUser.isActive) {
                req.user = {
                    id: currentUser._id.toString(),
                    role: currentUser.role,
                };
            }
        }
        catch (error) {
        }
    }
    next();
});
//# sourceMappingURL=auth.js.map