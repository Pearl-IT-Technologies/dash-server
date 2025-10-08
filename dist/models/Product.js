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
const ProductSchema = new mongoose_1.Schema({
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
}, {
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
});
ProductSchema.index({ createdAt: -1 });
ProductSchema.virtual("discountPercentage").get(function () {
    if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
    return 0;
});
ProductSchema.pre("save", function () {
    this.inStock = this.stockCount > 0;
});
const Product = mongoose_1.default.model("Product", ProductSchema);
exports.default = Product;
//# sourceMappingURL=Product.js.map