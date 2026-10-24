import mongoose, { Schema, Document } from "mongoose";

export type PrivateLinkAction = "created" | "updated" | "revoked" | "resolved" | "ordered" | "order_needs_review";

export interface IPrivateLinkEvent extends Document {
	link: mongoose.Types.ObjectId;
	action: PrivateLinkAction;
	actor?: mongoose.Types.ObjectId;
	ip?: string;
	order?: mongoose.Types.ObjectId;
	details?: any;
	createdAt: Date;
}

const PrivateLinkEventSchema = new Schema<IPrivateLinkEvent>(
	{
		link: { type: Schema.Types.ObjectId, ref: "PrivateLink", required: true, index: true },
		action: {
			type: String,
			enum: ["created", "updated", "revoked", "resolved", "ordered", "order_needs_review"],
			required: true,
		},
		actor: { type: Schema.Types.ObjectId, ref: "User" },
		ip: String,
		order: { type: Schema.Types.ObjectId, ref: "Order" },
		details: Schema.Types.Mixed,
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

const PrivateLinkEvent = mongoose.model<IPrivateLinkEvent>("PrivateLinkEvent", PrivateLinkEventSchema);

// Audit logging must never break the request that triggered it
export const logLinkEvent = async (data: Partial<IPrivateLinkEvent>) => {
	try {
		await PrivateLinkEvent.create(data);
	} catch (error) {
		console.error("Failed to write private link event:", error);
	}
};

export default PrivateLinkEvent;
