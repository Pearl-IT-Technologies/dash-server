import { Schema, model, Document, Types } from "mongoose";

interface ILoginHistory extends Document {
	userId: Types.ObjectId;
	timestamp: Date;
	ipAddress: string;
	userAgent: string;
	success: boolean;
	method?: string;
	location: {
		city: string;
		region: string;
		country: string;
	};
}

const loginHistorySchema = new Schema<ILoginHistory>({
	userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
	timestamp: { type: Date, default: Date.now },
	ipAddress: { type: String },
	userAgent: { type: String },
	success: { type: Boolean, default: true },
	method: { type: String, default: "password" },
	location: {
		city: String,
		region: String,
		country: String,
	},
});

export const LoginHistory = model<ILoginHistory>("LoginHistory", loginHistorySchema);
