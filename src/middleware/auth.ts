import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

// Extend Request interface to include user
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				role: string;
			};
		}
	}
}

interface JwtPayload {
	userId: string;
	iat: number;
	exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	// 1) Getting token and check if it's there
	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies?.token) {
    token = req.cookies.token;
	}

	if (!token) {
		throw new AppError("You are not logged in! Please log in to get access.", 401);
	}

	// 2) Verification token
	const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

	// 3) Check if user still exists
  const currentUser = await User.findById(decoded.userId);
	if (!currentUser) {
		throw new AppError("The user belonging to this token does no longer exist.", 401);
	}

	// 4) Check if user is active
	if (!currentUser.isActive) {
		throw new AppError("Your account has been deactivated. Please contact support.", 401);
	}

	// Grant access to protected route
	req.user = {
		id: currentUser._id.toString(),
		role: currentUser.role,
	};

	next();
});

export const restrictTo = (...roles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user || !roles.includes(req.user.role)) {
			throw new AppError("You do not have permission to perform this action", 403);
		}
		next();
	};
};

export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies?.token) {
		token = req.cookies.token;
	}

	if (token) {
		try {
			const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
			const currentUser = await User.findById(decoded.userId);

			if (currentUser && currentUser.isActive) {
				req.user = {
					id: currentUser._id.toString(),
					role: currentUser.role,
				};
			}
		} catch (error) {
			// Token is invalid, but we continue without setting req.user
		}
	}

	next();
});
