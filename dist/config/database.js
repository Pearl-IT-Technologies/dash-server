"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI;
console.log(MONGODB_URI);
const connectDatabase = async () => {
    try {
        const conn = await mongoose_1.default.connect(MONGODB_URI);
        console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
        mongoose_1.default.connection.on("connected", () => {
            console.log("✅ Mongoose connected to MongoDB");
        });
        mongoose_1.default.connection.on("error", (err) => {
            console.error("❌ Mongoose connection error:", err);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            console.log("⚠️ Mongoose disconnected from MongoDB");
        });
        process.on("SIGINT", async () => {
            await mongoose_1.default.connection.close();
            console.log("📦 MongoDB connection closed through app termination");
            process.exit(0);
        });
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.connection.close();
        console.log("📦 Database disconnected successfully");
    }
    catch (error) {
        console.error("❌ Error disconnecting from database:", error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
//# sourceMappingURL=database.js.map