import { IUser } from "../models/User";
import * as jwt from "jsonwebtoken";
import { Response } from "express";

// Helper function to generate JWT token
const generateToken = (userId: string) => {
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not defined in environment variables");
	}

	return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
		expiresIn: "7d",
	});
};

// Send token response
export const sendTokenResponse = (user: IUser, statusCode: number, res: Response) => {
	const token = generateToken(user._id.toString());

	const options = {
		expires: new Date(
			Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict" as const,
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