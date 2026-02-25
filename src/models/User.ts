import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

interface IAddress {
	_id?: string;
	type?: "billing" | "shipping";
	isDefault?: boolean;
	street?: string;
	city?: string;
	state?: string;
	zipCode?: string;
  country?: string;
  phone?: string;
}

export type UserAddress = Array<IAddress>;

export interface IUser extends Document {
	_id: string;
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password: string;
	role: "customer" | "storekeeper" | "salesrep" | "admin";
	avatar?: string;
	phone?: string;
	dateOfBirth?: Date;
	gender?: "male" | "female" | "other";
	addresses: UserAddress;
	preferences: {
		newsletter: boolean;
		smsNotifications: boolean;
		emailNotifications: boolean;
	};
	wishlist: mongoose.Types.ObjectId[];
	isActive: boolean;
	lastLogin?: Date;
	resetPasswordOtpHash?: string;
	resetPasswordOtpExpires?: Date;
	resetPasswordOtpAttempts?: number;
	resetPasswordOtpSentAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	comparePassword(candidatePassword: string): Promise<boolean>;
	getFullName(): string;
}

const AddressSchema = new Schema({
	type: {
		type: String,
		enum: ["billing", "shipping"],
		required: true,
	},
	isDefault: {
		type: Boolean,
		default: false,
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
	phone: {
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

const UserSchema = new Schema<IUser>(
	{
		firstName: {
			type: String,
			required: [true, "First name is required"],
			trim: true,
			maxlength: [50, "First name cannot exceed 50 characters"],
		},
		lastName: {
			type: String,
			required: [true, "Last name is required"],
			trim: true,
			maxlength: [50, "Last name cannot exceed 50 characters"],
		},
		username: {
			type: String,
			required: [true, "username is required"],
			unique: true,
			trim: true,
			maxlength: [50, "username cannot exceed 50 characters"],
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			trim: true,
			match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
		},
		password: {
			type: String,
			required: [true, "Password is required"],
			minlength: [6, "Password must be at least 6 characters long"],
			select: false, // Don't include password in queries by default
		},
		role: {
			type: String,
			enum: ["customer", "storekeeper", "salesrep", "admin"],
			default: "customer",
			index: true,
		},
		avatar: {
			type: String,
			default: "",
		},
		phone: {
			type: String,
			trim: true,
			match: [/^\+?[\d\s-()]+$/, "Please enter a valid phone number"],
		},
		dateOfBirth: {
			type: Date,
		},
		gender: {
			type: String,
			enum: ["male", "female", "other"],
		},
		addresses: [AddressSchema],
		preferences: {
			newsletter: {
				type: Boolean,
				default: true,
			},
			smsNotifications: {
				type: Boolean,
				default: false,
			},
			emailNotifications: {
				type: Boolean,
				default: true,
			},
		},
		wishlist: [
			{
				type: Schema.Types.ObjectId,
				ref: "Product",
			},
		],
		isActive: {
			type: Boolean,
			default: true,
			index: true,
		},
		lastLogin: {
			type: Date,
		},
		resetPasswordOtpHash: {
			type: String,
			select: false,
		},
		resetPasswordOtpExpires: {
			type: Date,
			select: false,
		},
		resetPasswordOtpAttempts: {
			type: Number,
			default: 0,
			select: false,
		},
		resetPasswordOtpSentAt: {
			type: Date,
			select: false,
		},
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				ret.id = ret._id;
				delete ret.__v;
				delete ret.password;
				return ret;
			},
		},
	},
);

//Index
UserSchema.index({ createdAt: -1 });

// Virtual for full name
UserSchema.virtual("fullName").get(function (this: IUser) {
	return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
UserSchema.pre<IUser>("save", async function (next) {
	if (!this.isModified("password")) return next();

	try {
		const salt = await bcrypt.genSalt(12);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error as Error);
	}
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
	try {
		return await bcrypt.compare(candidatePassword, this.password);
	} catch (error) {
		throw new Error("Error comparing passwords");
	}
};

// Instance method to get full name
UserSchema.methods.getFullName = function (): string {
	return `${this.firstName} ${this.lastName}`;
};

// Static method to find by email
UserSchema.statics.findByEmail = function (email: string) {
	return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
