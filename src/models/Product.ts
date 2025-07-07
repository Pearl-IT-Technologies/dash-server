import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
	name: string;
	description: string;
	price: number;
	originalPrice?: number;
	images: string[];
	category: string;
	subcategory: string;
	sizes: string[];
	colors: string[];
	inStock: boolean;
	stockCount: number;
	rating: number;
	reviewCount: number;
	features: string[];
	isNewProduct: boolean;
	isFeatured: boolean;
	isActive: boolean;
	tags: string[];
	sku: string;
	weight?: number;
	dimensions?: {
		length: number;
		width: number;
		height: number;
	};
	seoTitle?: string;
	seoDescription?: string;
	createdAt: Date;
	updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
	{
		name: {
			type: String,
			required: [true, "Product name is required"],
			trim: true,
			maxlength: [200, "Product name cannot exceed 200 characters"],
			index: true,
		},
		description: {
			type: String,
			required: [true, "Product description is required"],
			maxlength: [2000, "Description cannot exceed 2000 characters"],
			index: true,
		},
		price: {
			type: Number,
			required: [true, "Product price is required"],
			min: [0, "Price cannot be negative"],
			index: true,
		},
		originalPrice: {
			type: Number,
			min: [0, "Price cannot be negative"],
			index: true,
		},
		images: [
			{
				type: String,
				required: true,
			},
		],
		category: {
			type: String,
			required: [true, "Product category is required"],
			trim: true,
			index: true,
		},
		subcategory: {
			type: String,
			required: [true, "Product subcategory is required"],
			trim: true,
		},
		sizes: [
			{
				type: String,
				required: true,
				trim: true,
			},
		],
		colors: [
			{
				type: String,
				required: true,
				trim: true,
			},
		],
		inStock: {
			type: Boolean,
			default: true,
		},
		stockCount: {
			type: Number,
			required: [true, "Stock count is required"],
			min: [0, "Stock count cannot be negative"],
			default: 0,
		},
		rating: {
			type: Number,
			default: 0,
			min: [0, "Rating cannot be less than 0"],
			max: [5, "Rating cannot be more than 5"],
			index: true,
		},
		reviewCount: {
			type: Number,
			default: 0,
			min: [0, "Review count cannot be negative"],
		},
		features: [
			{
				type: String,
				trim: true,
			},
		],
		isNewProduct: {
			type: Boolean,
			default: false,
		},
		isFeatured: {
			type: Boolean,
			default: false,
		},
		isActive: {
			type: Boolean,
			default: true,
			index: true,
		},
		tags: [
			{
				type: String,
				trim: true,
				lowercase: true,
				index: true,
			},
		],
		sku: {
			type: String,
			required: [true, "SKU is required"],
			unique: true,
			trim: true,
			uppercase: true,
		},
		weight: {
			type: Number,
			min: [0, "Weight cannot be negative"],
		},
		dimensions: {
			length: {
				type: Number,
				min: [0, "Length cannot be negative"],
			},
			width: {
				type: Number,
				min: [0, "Width cannot be negative"],
			},
			height: {
				type: Number,
				min: [0, "Height cannot be negative"],
			},
		},
		seoTitle: {
			type: String,
			trim: true,
			maxlength: [60, "SEO title cannot exceed 60 characters"],
		},
		seoDescription: {
			type: String,
			trim: true,
			maxlength: [160, "SEO description cannot exceed 160 characters"],
		},
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				ret.id = ret._id;
				ret.isNew = ret.isNewProduct;
				delete ret.__v;
				return ret;
			},
		},
	},
);

//Index
ProductSchema.index({ createdAt: -1 });

// Virtual for discount percentage
ProductSchema.virtual("discountPercentage").get(function (this: IProduct) {
	if (this.originalPrice && this.originalPrice > this.price) {
		return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
	}
	return 0;
});

// Update inStock based on stockCount
ProductSchema.pre("save", function (this: IProduct) {
	this.inStock = this.stockCount > 0;
});

const Product = mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
