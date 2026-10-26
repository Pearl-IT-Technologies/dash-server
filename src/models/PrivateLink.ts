import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export const DEFAULT_LINK_TTL_HOURS = 48;

export interface IPrivateLinkItem {
	product: mongoose.Types.ObjectId;
	size?: string;
	color?: string;
	quantity: number;
}

export type PrivateLinkStatus = "active" | "expired" | "revoked" | "exhausted";

export interface IPrivateLink extends Document {
	tokenHash: string;
	title: string;
	note?: string;
	items: IPrivateLinkItem[];
	expiresAt: Date;
	maxUses?: number | null;
	uses: number;
	createdBy: mongoose.Types.ObjectId;
	revokedAt?: Date | null;
	revokedBy?: mongoose.Types.ObjectId | null;
	status: PrivateLinkStatus;
	createdAt: Date;
	updatedAt: Date;
}

const PrivateLinkItemSchema = new Schema<IPrivateLinkItem>(
	{
		product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
		size: { type: String, trim: true },
		color: { type: String, trim: true },
		quantity: { type: Number, required: true, min: [1, "Quantity must be at least 1"] },
	},
	{ _id: false },
);

const PrivateLinkSchema = new Schema<IPrivateLink>(
	{
		// Only the sha256 of the token is stored; the raw token is returned once at creation
		tokenHash: { type: String, required: true, unique: true, select: false },
		title: { type: String, required: true, trim: true, maxlength: 120 },
		note: { type: String, trim: true, maxlength: 500 },
		items: {
			type: [PrivateLinkItemSchema],
			validate: [(v: IPrivateLinkItem[]) => Array.isArray(v) && v.length > 0, "At least one item is required"],
		},
		expiresAt: {
			type: Date,
			required: true,
			default: () => new Date(Date.now() + DEFAULT_LINK_TTL_HOURS * 60 * 60 * 1000),
			index: true,
		},
		maxUses: { type: Number, min: [1, "maxUses must be at least 1"], default: null },
		uses: { type: Number, default: 0, min: 0 },
		createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		revokedAt: { type: Date, default: null },
		revokedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				ret.id = ret._id;
				delete (ret as any).__v;
				delete (ret as any).tokenHash;
				return ret;
			},
		},
	},
);

PrivateLinkSchema.virtual("status").get(function (this: IPrivateLink): PrivateLinkStatus {
	if (this.revokedAt) return "revoked";
	if (this.expiresAt.getTime() <= Date.now()) return "expired";
	if (this.maxUses && this.uses >= this.maxUses) return "exhausted";
	return "active";
});

PrivateLinkSchema.index({ createdAt: -1 });

export const generateLinkToken = () => crypto.randomBytes(32).toString("base64url");
export const hashLinkToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// Mongo filter for links that can still be used right now
export const usableLinkFilter = () => ({
	revokedAt: null,
	expiresAt: { $gt: new Date() },
	$or: [{ maxUses: null }, { $expr: { $lt: ["$uses", "$maxUses"] } }],
});

const PrivateLink = mongoose.model<IPrivateLink>("PrivateLink", PrivateLinkSchema);

export default PrivateLink;
