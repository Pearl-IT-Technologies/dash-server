"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const OrderItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const ShippingAddressSchema = new mongoose_1.Schema({
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
const OrderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    paymentDetails: mongoose_1.Schema.Types.Mixed,
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
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
OrderSchema.index({ createdAt: -1 });
OrderSchema.pre("save", async function () {
    if (this.isNew) {
        const count = await mongoose_1.default.model("Order").countDocuments();
        this.orderNumber = `ORD-${String(count + 1).padStart(6, "0")}`;
    }
});
const Order = mongoose_1.default.model("Order", OrderSchema);
exports.default = Order;
//# sourceMappingURL=Order.js.map