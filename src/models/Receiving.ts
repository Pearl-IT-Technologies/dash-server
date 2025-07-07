import mongoose, { Schema, Document } from "mongoose";

export interface IReceiving extends Document {
	product: mongoose.Types.ObjectId;
	quantity: number;
	note?: string;
	receivedBy: mongoose.Types.ObjectId;
	receivedAt: Date;
}

const receivingSchema = new Schema<IReceiving>(
	{
		product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
		quantity: { type: Number, required: true },
		note: { type: String },
		receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		receivedAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				ret.id = ret._id;
				delete ret.__v;
				return ret;
			},
		},
	},
);

export const Receiving = mongoose.model<IReceiving>("Receiving", receivingSchema);
