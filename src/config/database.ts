import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

export const connectDatabase = async (): Promise<void> => {
	try {
    await mongoose.connect(MONGODB_URI);
    
		// Connection event listeners
		mongoose.connection.on("connected", () => {
			console.log("✅ Mongoose connected to MongoDB");
		});

		mongoose.connection.on("error", (err) => {
			console.error("❌ Mongoose connection error:", err);
		});

		mongoose.connection.on("disconnected", () => {
			console.log("⚠️ Mongoose disconnected from MongoDB");
		});

		// Graceful shutdown
		process.on("SIGINT", async () => {
			await mongoose.connection.close();
			console.log("📦 MongoDB connection closed through app termination");
			process.exit(0);
		});
	} catch (error) {
		console.error("❌ Database connection failed:", error);
		throw error;
	}
};

export const disconnectDatabase = async (): Promise<void> => {
	try {
		await mongoose.connection.close();
		console.log("📦 Database disconnected successfully");
	} catch (error) {
		console.error("❌ Error disconnecting from database:", error);
		throw error;
	}
};
