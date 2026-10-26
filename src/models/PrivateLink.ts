import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export const DEFAULT_LINK_TTL_HOURS = 48;

export type LinkItemSpecMode = "locked" | "choosable";

export interface IPrivateLinkItem {
	product: mongoose.Types.ObjectId;
	size?: string; // preset (locked) or default (choosable)
	color?: string;
	quantity: number;
	// "locked": buyer gets exactly size/color. "choosable": buyer picks from allowedSizes/allowedColors
	// (empty list = all of the product's options)
	specMode: LinkItemSpecMode;
	allowedSizes: string[];
	allowedColors: string[];
}

export type PrivateLinkStatus = "active" | "expired" | "revoked" | "exhausted";

export interface IPrivateLink extends Document {
	tokenHash: string;
	tokenNonce?: string | null;
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
		specMode: { type: String, enum: ["locked", "choosable"], default: "locked" },
		allowedSizes: { type: [String], default: [] },
		allowedColors: { type: [String], default: [] },
	},
	{ _id: false },
);

const PrivateLinkSchema = new Schema<IPrivateLink>(
	{
		// Only the sha256 of the token is stored; the raw token is returned once at creation
		tokenHash: { type: String, required: true, unique: true, select: false },
		// Random per-link nonce; token = HMAC(secret, nonce) so staff can re-copy the URL.
		// Links created before this existed have no nonce and cannot be re-shown.
		tokenNonce: { type: String, default: null, select: false },
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
				delete (ret as any).tokenNonce;
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

// True when the URL can be rebuilt (requires the nonce to be selected in the query)
PrivateLinkSchema.virtual("recopyable").get(function (this: IPrivateLink) {
	return !!this.tokenNonce;
});

PrivateLinkSchema.index({ createdAt: -1 });

const linkSecret = () => {
	const secret = process.env.PRIVATE_LINK_SECRET || process.env.JWT_SECRET;
	if (!secret) throw new Error("PRIVATE_LINK_SECRET or JWT_SECRET must be set");
	return secret;
};

export const deriveLinkToken = (nonce: string) =>
	crypto.createHmac("sha256", linkSecret()).update(`private-link:${nonce}`).digest("base64url");

// New token plus the nonce needed to rebuild it later
export const generateLinkToken = () => {
	const nonce = crypto.randomBytes(32).toString("base64url");
	return { token: deriveLinkToken(nonce), nonce };
};
export const hashLinkToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// Mongo filter for links that can still be used right now
export const usableLinkFilter = () => ({
	revokedAt: null,
	expiresAt: { $gt: new Date() },
	$or: [{ maxUses: null }, { $expr: { $lt: ["$uses", "$maxUses"] } }],
});

const PrivateLink = mongoose.model<IPrivateLink>("PrivateLink", PrivateLinkSchema);

export default PrivateLink;

// Options the buyer may pick for a choosable item (allowed subset, or every product option)
export const itemSizeOptions = (item: Partial<IPrivateLinkItem>, product: { sizes?: string[] }) =>
	item.allowedSizes?.length ? item.allowedSizes : product.sizes || [];
export const itemColorOptions = (item: Partial<IPrivateLinkItem>, product: { colors?: string[] }) =>
	item.allowedColors?.length ? item.allowedColors : product.colors || [];
