import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";

import { connectDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import userRoutes from "./routes/users";
import uploadRoutes from "./routes/upload";
import { initSocket } from "./utils/socket";
import { verifyTransporter } from "./config/email";

const app = express();
const server = createServer(app);

// ✅ This allows cross-origin requests
export const io = new Server(server, {
	cors: {
		origin: [
			`${process.env.CLIENT_URL || "https://dash-client.fly.dev"}`,
			"https://dash-ng-shop-client.vercel.app/",
		],
		methods: ["GET", "POST"],
	},
	transports: ["websocket"],
	pingInterval: 10000, // send ping every 10 seconds
	pingTimeout: 5000, // disconnect if no pong in 5 seconds
});

const PORT = Number(process.env.PORT) || 5000;

// Security middleware
app.use(
	helmet({
		crossOriginEmbedderPolicy: false,
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
				fontSrc: ["'self'", "https://fonts.gstatic.com"],
				imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
				scriptSrc: ["'self'"],
				connectSrc: ["'self'", "https://api.cloudinary.com"],
			},
		},
	}),
);

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	message: "Too many requests from this IP, please try again later.",
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => {
		return req.method === "GET";
	},
});

app.use(limiter);

// CORS configuration
app.use(cors());

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "OK",
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || "development",
	});
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

// Socket.IO for real-time features
initSocket(io);

// Global error handler
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
	try {
		await connectDatabase();
		await verifyTransporter();
		console.log("✅ Database connected successfully");

		server.listen(PORT, "0.0.0.0", () => {
			console.log(`🚀 Server running on port ${PORT}`);
			console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
};

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received, shutting down gracefully");
	server.close(() => {
		console.log("Process terminated");
	});
});

process.on("SIGINT", () => {
	console.log("SIGINT received, shutting down gracefully");
	server.close(() => {
		console.log("Process terminated");
	});
});

startServer();
export default app;
