// models/Setting.ts
import mongoose from "mongoose";

export interface ISetting extends mongoose.Document {
	usdToNgnRate: number;
	lastUpdated: Date;
	updatedBy?: mongoose.Types.ObjectId;
}

const SettingSchema = new mongoose.Schema({
	usdToNgnRate: {
		type: Number,
		required: true,
		default: 1650,
		min: [1, "Exchange rate must be greater than 0"],
	},
	lastUpdated: {
		type: Date,
		default: Date.now,
	},
	updatedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
}, {
	timestamps: true,
});

// Single settings document is enforced in code (findOne() then create()); an empty
// index spec is invalid in MongoDB, so no index is declared here.

const Setting = mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;