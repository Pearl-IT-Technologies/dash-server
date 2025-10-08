// models/Order.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
	product: mongoose.Types.ObjectId;
	name: string;
	price: number; // Price in USD (will be converted to NGN for display)
	quantity: number;
	size: string;
	color: string;
	image: string;
}

export interface IShippingAddress {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	street: string;
	city: string;
	state: string;
	zipCode: string;
	country: string;
}

export interface IOrder extends Document {
	orderNumber: string;
	user?: mongoose.Types.ObjectId;
	items: IOrderItem[];
	subtotal: number; // Subtotal in USD
	shipping: number; // Shipping in USD
	tax: number; // Tax in USD
	total: number; // Total in USD
	status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
	paymentStatus: "pending" | "paid" | "failed" | "refunded";
	paymentMethod: string;
	paymentDetails?: any;
	shippingAddress: IShippingAddress;
	billingAddress?: IShippingAddress;
	trackingNumber?: string;
	estimatedDelivery?: Date;
	deliveredAt?: Date;
	cancelledAt?: Date;
	cancelReason?: string;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
	product: {
		type: Schema.Types.ObjectId,
		ref: "Product",
		required: true,
	},
	name: {
		type: String,
		required: true,
		trim: true,
	},
	price: {
		type: Number,
		required: true,
		min: [0, "Price cannot be negative"],
	},
	quantity: {
		type: Number,
		required: true,
		min: [1, "Quantity must be at least 1"],
	},
	size: {
		type: String,
		trim: true,
	},
	color: {
		type: String,
		trim: true,
	},
	image: {
		type: String,
		trim: true,
	},
});

const ShippingAddressSchema = new Schema<IShippingAddress>({
	firstName: {
		type: String,
		required: true,
		trim: true,
	},
	lastName: {
		type: String,
		required: true,
		trim: true,
	},
	email: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
	},
	phone: {
		type: String,
		trim: true,
	},
	street: {
		type: String,
		required: true,
		trim: true,
	},
	city: {
		type: String,
		required: true,
		trim: true,
	},
	state: {
		type: String,
		required: true,
		trim: true,
	},
	zipCode: {
		type: String,
		required: true,
		trim: true,
	},
	country: {
		type: String,
		required: true,
		trim: true,
		default: "Nigeria",
	},
});

const OrderSchema = new Schema<IOrder>(
	{
		orderNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
      index: true
		},
		items: [OrderItemSchema],
		subtotal: {
			type: Number,
			required: true,
			min: [0, "Subtotal cannot be negative"],
		},
		shipping: {
			type: Number,
			required: true,
			min: [0, "Shipping cannot be negative"],
			default: 0,
		},
		tax: {
			type: Number,
			required: true,
			min: [0, "Tax cannot be negative"],
			default: 0,
		},
		total: {
			type: Number,
			required: true,
			min: [0, "Total cannot be negative"],
		},
		status: {
			type: String,
			enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
      index: true
		},
		paymentStatus: {
			type: String,
			enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true
		},
		paymentMethod: {
			type: String,
			required: true,
		},
		paymentDetails: Schema.Types.Mixed,
		shippingAddress: {
			type: ShippingAddressSchema,
			required: true,
		},
		billingAddress: ShippingAddressSchema,
		trackingNumber: {
			type: String,
			trim: true,
		},
		estimatedDelivery: Date,
		deliveredAt: Date,
		cancelledAt: Date,
		cancelReason: {
			type: String,
			trim: true,
		},
		notes: {
			type: String,
			trim: true,
			maxlength: [500, "Notes cannot exceed 500 characters"],
		},
	},
	{
		timestamps: true,
		toJSON: {
			transform: function (doc, ret) {
				ret.id = ret._id;
				delete ret.__v;
				return ret;
			},
		},
	},
);


//Index
OrderSchema.index({ createdAt: -1 });

const Order = mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
